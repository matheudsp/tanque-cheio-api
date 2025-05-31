import { LocalSignInDto, LocalSignInRolesDto } from './dtos/local.dto';
import { compareHash, zodErrorParse } from '@/common/utils/lib';
import { localAuthSchema, localAuthSchemaWithRole } from './schemas/local.schema';
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
      if (!user) return responseNotFound({ message: 'Usuário não encontrado' });
      const hasRoles = (await this.hasRolesRepo.findByUserId(user.id)).map(
        (value) => ({
          id: value?.role?.id,
          code: value?.role?.code,
          name: value?.role?.name,
        }),
      );
      const isMatch = compareHash(parsed.password, user.password);
      if (!isMatch)
        return responseBadRequest({ message: 'Credenciais inválidas' });
      const payload = { user_id: user.id };
      const accessToken = this.jwt.sign(payload, {
        expiresIn: '3m',
        secret: process.env.JWT_SECRET,
      });
      const { password, ...restUser } = user;
      return responseOk({
        data: {
          user: restUser,
          has_roles: hasRoles,
          access_token: accessToken,
        },
      });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });
      return responseInternalServerError({
        error: error.message || 'Erro do Servidor Interno',
      });
    }
  }

  async localSignInRole(data: LocalSignInRolesDto) {
    try {
      const parsed = localAuthSchemaWithRole.parse(data);
      const [user, role] = await Promise.all([
        this.userRepo.findById(parsed.user_id),
        this.hasRolesRepo.findHasRoleUser(parsed.role_id, parsed.user_id),
      ]);
      if (!user || !role)
        return responseUnauthorized({ message: 'Não autorizado' });
      const payload = { user_id: user.id, role_id: role.role_id };
      const accessToken = await this.jwt.signAsync(payload, {
        expiresIn: '24h',
        secret: process.env.JWT_SECRET,
      });
      const { password, ...restUser } = user;
      return responseOk({
        message: 'Login success',
        data: { access_token: accessToken, user: restUser, role: role.role },
      });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });
      return responseInternalServerError({
        error: error.message || 'Erro do Servidor Interno',
      });
    }
  }
}