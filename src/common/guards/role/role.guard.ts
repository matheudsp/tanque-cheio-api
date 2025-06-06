import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

import { Action } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from '@/api/permissions/repositories/permissions.repository';
import { JwtPayload } from '@/common/interfaces/jwt-payload';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionsRepo: PermissionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.getBearerToken(req);
    const payload = this.parseToken(token);

    // Adiciona o payload ao request para que o controller possa acessar
    req.user = payload;

    // Verifica se a rota atual precisa de validação de permissões
    const { path, method } = this.resolveRoute(req.url, req.method);
    const needsPermissionCheck = await this.routeExistsInDatabase(path);

    // Se a rota não está no banco de dados, permite acesso (rota pública)
    if (!needsPermissionCheck) {
      return true;
    }

    // Se a rota está no banco mas o usuário não tem role, bloqueia
    if (!payload.role_id) {
      throw new ForbiddenException(
        'Acesso negado: usuário sem permissões para esta rota'
      );
    }

    // Valida as permissões específicas do usuário
    await this.validatePermissions(payload.role_id, path, method);
    return true;
  }

  private getBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Token de autorização ausente');
    }

    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de autorização inválido');
    }

    try {
      this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service',
      });
      return token;
    } catch (err: any) {
      const name = err.name;
      if (name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }
      if (name === 'NotBeforeError') {
        throw new UnauthorizedException('Token ainda não é válido');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }

  private parseToken(token: string): JwtPayload {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    if (!decoded || typeof decoded !== 'object' || !decoded.user_id) {
      throw new UnauthorizedException('Token inválido ou incompleto');
    }
    return decoded;
  }

  private resolveRoute(
    rawUrl: string,
    rawMethod: string,
  ): { path: string; method: string } {
    const method = rawMethod.toUpperCase();
    const cleanUrl = rawUrl.replace(/\.\./g, '').replace(/\/+/g, '/');

    // Tenta captar o prefixo /api/vN/, mas não obriga
    const versionMatch = cleanUrl.match(/\/api\/v\d+\//);
    let afterVersion: string;

    if (versionMatch) {
      // Se achar algo como "/api/v1/", remove esse trecho e pega o resto
      afterVersion = cleanUrl.split(versionMatch[0])[1] || '';
    } else {
      // Se não achar, considera toda a URL (removendo a barra inicial)
      afterVersion = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
    }

    // Isola a parte do endpoint (antes de ?query=...)
    let endpoint = afterVersion.split('?')[0];
    // Garante que comece e termine adequadamente em "/" ou string vazia
    endpoint = `/${endpoint}`.replace(/\/+$/, '') || '/';

    return { path: endpoint.toLowerCase(), method };
  }

  /**
   * Verifica se a rota existe no banco de dados (resources)
   * Se não existir, é considerada uma rota pública
   */
  private async routeExistsInDatabase(
    requestPath: string,
    
  ): Promise<boolean> {
    try {
      return await this.permissionsRepo.resourceExists(requestPath);
    } catch (error) {
      console.error('Erro ao verificar se rota existe no banco:', error);
      // Em caso de erro, assume que é rota pública para não bloquear desnecessariamente
      return false;
    }
  }

  private async validatePermissions(
    roleId: string,
    requestPath: string,
    requestMethod: string,
  ): Promise<void> {
    const rawPerms = await this.permissionsRepo.findByRoleId(roleId);
    if (!rawPerms?.length) {
      throw new ForbiddenException(
        'Nenhuma permissão encontrada para este usuário',
      );
    }

    type Perm = { methods: Action[]; path: string };
    const perms: Perm[] = rawPerms.map((p) => ({
      methods: Array.isArray(p.action) ? p.action : [p.action],
      path: (p.resource?.path || '').toLowerCase(),
    }));

    // Permissão global ALL
    if (perms.some((p) => p.methods.includes(Action.ALL) && p.path === '*')) {
      return;
    }

    const normalize = (s: string) => s.replace(/^\/+|\/+$/g, '');

    const hasAccess = perms.some(({ methods, path }) => {
      if (
        !methods.includes(requestMethod as Action) &&
        !methods.includes(Action.ALL)
      ) {
        return false;
      }
      if (path === '*') {
        return true;
      }

      const permNorm = normalize(path);
      const reqNorm = normalize(requestPath);

      if (permNorm === reqNorm) {
        return true;
      }
      if (reqNorm.startsWith(permNorm + '/')) {
        return true;
      }
      const segments = reqNorm.split('/');
      return segments.includes(permNorm);
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `Acesso negado para ${requestMethod} ${requestPath}`,
      );
    }
  }
}