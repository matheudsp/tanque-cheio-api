import { LocalSignInDto } from './dtos/local.dto';
import { compareHash, zodErrorParse } from '@/common/utils/lib';
import { localAuthSchema } from './schemas/local.schema';
import {
  responseBadRequest,
  responseInternalServerError,
  responseNotFound,
  responseOk,
  responseUnauthorized,
} from '@/common/utils/response-api';

import { HasRoleRepository } from '@/api/has-roles/repositories/has-roles.repository';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from '@/api/users/repositories/users.repository';
import { randomBytes } from 'crypto';

interface TokenPayload {
  user_id: string;
  role_id: string | null;
  session_id: string;
  iat: number;
}

interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}

@Injectable()
export class LocalService {
  constructor(
    private readonly userRepo: UsersRepository,
    private readonly jwt: JwtService,
    private readonly hasRolesRepo: HasRoleRepository,
  ) {}

  async localSignIn(data: LocalSignInDto) {
    try {
      const parsed = localAuthSchema.parse(data);
      
      const user = await this.userRepo.findByEmail(parsed.email);
      if (!user) {
        return responseNotFound({ message: 'Usuário não encontrado' });
      }

      // // Verificar se o usuário está ativo
      // if (!user.is_active) {
      //   return responseUnauthorized({ message: 'Conta desativada' });
      // }

      const isMatch = compareHash(parsed.password, user.password);
      if (!isMatch) {
        return responseBadRequest({ message: 'Credenciais inválidas' });
      }

      // Buscar roles do usuário
      const userRole = await this.hasRolesRepo.findByUserId(user.id);
      
      const roleData = {
        id: userRole?.role?.id || null,
        code: userRole?.role?.code || null,
        name: userRole?.role?.name || null,
      };

      // session ID único para prevenir session fixation
      const sessionId = randomBytes(32).toString('hex');
      
      // Criar tokens
      const tokens = this.generateTokens({
        user_id: user.id,
        role_id: roleData.id,
        session_id: sessionId,
      });

      const { password, ...restUser } = user;

      return responseOk({
        message: 'Login realizado com sucesso',
        data: {
          user: restUser,
          role: roleData,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: 28800, // 8 horas em segundos
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
        return responseUnauthorized({ message: 'Usuário não encontrado ou inativo' });
      }

      // Buscar roles atualizadas do usuário
      const userRole = await this.hasRolesRepo.findByUserId(user.id);
      
      const roleData = {
        id: userRole?.role?.id || null,
        code: userRole?.role?.code || null,
        name: userRole?.role?.name || null,
      };

      // Gerar novo session ID
      const newSessionId = randomBytes(32).toString('hex');
      
      // Gerar novos tokens
      const tokens = this.generateTokens({
        user_id: user.id,
        role_id: roleData.id,
        session_id: newSessionId,
      });

      return responseOk({
        message: 'Tokens renovados com sucesso',
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: 28800,
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

  async logout(userId: string, sessionId: string) {
    try {
      // Aqui você pode implementar uma blacklist de tokens
      // ou invalidar a sessão no Redis/banco de dados
      
      // Por enquanto, apenas retornamos sucesso
      // Em uma implementação completa, você adicionaria o token/sessão
      // a uma blacklist para invalidá-lo
      
      return responseOk({
        message: 'Logout realizado com sucesso',
      });

    } catch (error) {
      console.error('Erro no logout:', error);
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

    // Access Token (8 horas)
    const accessToken = this.jwt.sign(basePayload, {
      expiresIn: '8h',
      secret: process.env.JWT_SECRET,
      audience: 'api-client',
      issuer: 'auth-service',
    });

    // Refresh Token (30 dias)
    const refreshToken = this.jwt.sign(
      { ...basePayload, type: 'refresh' },
      {
        expiresIn: '30d',
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service',
      }
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