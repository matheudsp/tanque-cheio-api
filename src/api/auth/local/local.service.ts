import {
  LocalSignInDto,
  LocalSignUpDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
} from './dtos/local.dto';
import {
  compareHash,
  createHash,
  parseDurationToSeconds,
  uniqueCodeUppercase,
  zodErrorParse,
} from '@/common/utils/lib';
import {
  forgotPasswordSchema,
  localAuthSchema,
  resetPasswordSchema,
  signUpLocalSchema,
} from './schemas/local.schema';
import {
  responseBadRequest,
  responseConflict,
  responseInternalServerError,
  responseNotFound,
  responseOk,
  responseUnauthorized,
} from '@/common/utils/response-api';

import { HasRoleRepository } from '@/api/has-roles/repositories/has-roles.repository';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from '@/api/users/repositories/users.repository';
import { RolesRepository } from '@/api/roles/repositories/roles.repository';
import { EmailService } from '@/common/services/email/email.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { seconds } from '@nestjs/throttler';

interface TokenPayload {
  user_id: string;
  role_id: string | null;
  iat: number;
}

interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}

@Injectable()
export class LocalService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly userRepo: UsersRepository,
    private readonly jwt: JwtService,
    private readonly hasRolesRepo: HasRoleRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly emailService: EmailService,
  ) {}

  async forgotPassword(data: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordSchema.parse(data);
      const user = await this.userRepo.findByEmail(email);

      if (user) {
        const code = uniqueCodeUppercase(6); // Gerando um código de 6 dígitos
        const cacheKey = `reset-password:${email}`;

        // Armazena o código no cache por 10 minutos (600 segundos)
        await this.cache.set(cacheKey, code, seconds(600));
        await this.emailService.sendPasswordResetCode(user.email, code);
      }

      return responseOk({
        message:
          'Se um usuário com este e-mail existir, um código de redefinição foi enviado.',
      });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) {
        return responseBadRequest({ error: zodErr.errors });
      }
      return responseInternalServerError({
        message: 'Erro ao processar a solicitação.',
      });
    }
  }

  async resetPassword(data: ResetPasswordDto) {
    try {
      const { email, code, password } = resetPasswordSchema.parse(data);

      const cacheKey = `reset-password:${email}`;
      const cachedCode = await this.cache.get<string>(cacheKey);

      if (!cachedCode) {
        return responseBadRequest({ message: 'Código expirado ou inválido.' });
      }

      if (cachedCode !== code) {
        return responseBadRequest({ message: 'Código incorreto.' });
      }

      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        // Isso não deveria acontecer se o código existe, mas é uma segurança extra
        return responseBadRequest({ message: 'Usuário não encontrado.' });
      }

      const hashedPassword = createHash(password);
      await this.userRepo.updatePassword(user.id, hashedPassword);

      // Remove o código do cache para que não possa ser reutilizado
      await this.cache.del(cacheKey);

      return responseOk({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) {
        return responseBadRequest({ error: zodErr.errors });
      }
      return responseInternalServerError({
        message: 'Erro ao redefinir a senha.',
      });
    }
  }

  async signUp(data: LocalSignUpDto) {
    try {
      const parsedData = signUpLocalSchema.parse(data);

      const userExists = await this.userRepo.findByEmail(parsedData.email);

      if (userExists) {
        return responseConflict({
          message: 'O e-mail fornecido já está em uso.',
        });
      }

      const hashedPassword = createHash(parsedData.password);

      const newUser = await this.userRepo.store({
        name: parsedData.name,
        email: parsedData.email,
        password: hashedPassword,
        passwordConfirmation: parsedData.passwordConfirmation,
      });

      const guestRole = await this.rolesRepo.findByCode('guest');
      if (!guestRole) {
        // Se a role 'guest' não existir, é um erro de configuração do sistema
        console.error("A role 'guest' não foi encontrada no banco de dados.");
        return responseInternalServerError({
          message: 'Erro na configuração do sistema de permissões.',
        });
      }

      await this.hasRolesRepo.store({
        user_id: newUser.id,
        role_id: guestRole.id,
      });

      const { password, ...user } = newUser;

      return responseOk({
        message: 'Usuário registrado com sucesso!',
        data: user,
      });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) {
        return responseBadRequest({ error: zodErr.errors });
      }
      console.error('Erro no registro de usuário:', error);
      return responseInternalServerError({
        message: 'Ocorreu um erro interno ao tentar registrar o usuário.',
        error,
      });
    }
  }

  async signIn(data: LocalSignInDto) {
    try {
      const parsed = localAuthSchema.parse(data);

      const user = await this.userRepo.findByEmail(parsed.email);
      if (!user) {
        return responseNotFound({ message: 'Usuário não encontrado' });
      }

      const isMatch = compareHash(parsed.password, user.password);
      if (!isMatch) {
        return responseBadRequest({ message: 'Credenciais inválidas' });
      }

      const userRole = await this.hasRolesRepo.findByUserId(user.id);

      const roleData = {
        id: userRole?.role?.id || null,
        code: userRole?.role?.code || null,
        name: userRole?.role?.name || null,
      };

      const tokens = this.generateTokens({
        user_id: user.id,
        role_id: roleData.id,
      });

      const { password, ...restUser } = user;

      const expiresInSeconds = parseDurationToSeconds(
        process.env.JWT_EXPIRES_IN || '8h',
      );

      return responseOk({
        message: 'Login realizado com sucesso',
        data: {
          user: restUser,
          role: roleData,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: expiresInSeconds,
          token_type: 'Bearer',
        },
      });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) {
        return responseBadRequest({ error: zodErr.errors });
      }

      console.error('Erro no login:', error);

      return responseInternalServerError({
        error: 'Erro interno do servidor',
      });
    }
  }

  async refreshToken(refreshTokenInput: string) {
    try {
      // Verificar e decodificar o refresh token
      const decoded = this.jwt.verify(refreshTokenInput, {
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service',
      }) as RefreshTokenPayload;

      // Verificar se é um refresh token válido
      if (decoded.type !== 'refresh') {
        return responseUnauthorized({ message: 'Token de refresh inválido' });
      }

      // Verificar se o usuário ainda existe e está ativo
      const user = await this.userRepo.findById(decoded.user_id);
      if (!user) {
        return responseUnauthorized({
          message: 'Usuário não encontrado ou inativo',
        });
      }

      // Buscar roles atualizadas do usuário
      const userRole = await this.hasRolesRepo.findByUserId(user.id);

      const roleData = {
        id: userRole?.role?.id || null,
        code: userRole?.role?.code || null,
        name: userRole?.role?.name || null,
      };

      // Gerar novos tokens
      const tokens = this.generateTokens({
        user_id: user.id,
        role_id: roleData.id,
      });

      const expiresInSeconds = parseDurationToSeconds(
        process.env.JWT_REFRESH_EXPIRES_IN || '8h',
      );

      return responseOk({
        message: 'Tokens renovados com sucesso',
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: expiresInSeconds,
          token_type: 'Bearer',
        },
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return responseUnauthorized({ message: 'Refresh token expirado' });
      }
      if (error.name === 'JsonWebTokenError') {
        return responseUnauthorized({ message: 'Refresh token inválido' });
      }

      console.error('Erro no refresh token:', error);
      return responseInternalServerError({
        error: 'Erro interno do servidor',
      });
    }
  }

  private generateTokens(payload: Omit<TokenPayload, 'iat'>) {
    const basePayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwt.sign(basePayload, {
      expiresIn: process.env.JWT_EXPIRES_IN,
      secret: process.env.JWT_SECRET,
      audience: 'api-client',
      issuer: 'auth-service',
    });

    const refreshToken = this.jwt.sign(
      { ...basePayload, type: 'refresh' },
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service',
      },
    );

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string): Promise<any> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return null;
      }

      const { password, ...result } = user;
      return result;
    } catch (error) {
      console.error('Erro ao validar usuário:', error);
      return null;
    }
  }
}
