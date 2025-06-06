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

      const isMatch = compareHash(parsed.password, user.password);
      if (!isMatch) {
        return responseBadRequest({ message: 'Credenciais inválidas' });
      }

      // Buscar roles do usuário
      const userRole = await this.hasRolesRepo.findByUserId(user.id);
      
      const roleData = {
        id: userRole?.role?.id,
        code: userRole?.role?.code,
        name: userRole?.role?.name,
      };

      // session ID único para prevenir session fixation
      const sessionId = randomBytes(32).toString('hex');
      
      // Estruturação do payload JWT
      const payload = { 
        user_id: user.id, 
        role_id: roleData.id,
        session_id: sessionId,
        iat: Math.floor(Date.now() / 1000)
      };

      const accessToken = this.jwt.sign(payload, {
        expiresIn: '8h', 
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service'
      });

      const { password, ...restUser } = user;

      return responseOk({
        message: 'Login realizado com sucesso',
        data: {
          user: restUser,
          role: roleData,
          access_token: accessToken,
          expires_in: 28800, // 8 horas em segundos
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

  async refreshToken(userId: string, currentSessionId: string) {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return responseUnauthorized({ message: 'Usuário não encontrado' });
      }

      const roleData = await this.hasRolesRepo.findByUserId(user.id);

      const newSessionId = randomBytes(32).toString('hex');
      
      const payload = { 
        user_id: user.id, 
        role_id: roleData?.id,
        session_id: newSessionId,
        iat: Math.floor(Date.now() / 1000)
      };

      const accessToken = this.jwt.sign(payload, {
        expiresIn: '8h',
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service'
      });

      return responseOk({
        data: {
          access_token: accessToken,
          expires_in: 28800,
        },
      });

    } catch (error) {
      console.error('Erro no refresh token:', error);
      return responseInternalServerError({
        error: 'Erro interno do servidor',
      });
    }
  }
}