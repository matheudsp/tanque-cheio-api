import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Action } from '@/database/entity/permissions.entity';
import { JwtService } from '@nestjs/jwt';
import { PermissionsRepository } from '@/api/permissions/repositories/permissions.repository';
import { Request } from 'express';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private permissionRepo: PermissionsRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.handleAuthorization(request);
    const url: string = request.url;
    const [_, afterVersion] = url.split(/api\/v\d+\//);
    const [resourcesUrl] = afterVersion.split('?');
    const method = request.method.toUpperCase();
    const { role_id } = this.jwt.decode(
      request.headers.authorization.split(' ')[1],
    );
    const permissions = (await this.permissionRepo.findByRoleId(role_id))?.map(
      (p) => ({
        id: p.id,
        name: p.resource?.name,
        allowedMethod: p.action,
        path: p.resource?.path,
      }),
    );
    const hasAllPermission = permissions?.some(
      (p) => p.allowedMethod.includes(Action.ALL) && p.path === '*',
    );
    if (hasAllPermission) return true;
    if (!permissions.length) throw new ForbiddenException('Recurso Proibido');
    const hasPermission = permissions?.some((permission) => {
      const { allowedMethod, path } = permission;
      const isAllowedMethod = allowedMethod.includes(method);
      const isAllowedPath = `/${resourcesUrl}`.includes(path || '');
      return isAllowedMethod && isAllowedPath;
    });
    if (!hasPermission) throw new ForbiddenException('Recurso Proibido');
    return true;
  }

  handleAuthorization(request: Request) {
    const authorization = request.headers.authorization;
    if (!authorization)
      throw new UnauthorizedException('Cabeçalho de autorização ausente');
    const [bearer, token] = authorization.split(' ');
    const errMessage = !token
      ? 'O token está faltando'
      : 'O cabeçalho de autorização é inválido';
    if (bearer !== 'Bearer' || !token)
      throw new UnauthorizedException(errMessage);
    try {
      this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError')
        throw new UnauthorizedException(error.message);
      throw new UnauthorizedException('O token é inválido');
    }
  }
}