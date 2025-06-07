import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '@/api/permissions/permissions.service';

/**
 * Guard que valida autenticação E autorização baseada em roles/permissões
 * Herda a funcionalidade de validação de token e adiciona validação de permissões
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly jwtGuardService: JwtGuardService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Extrai, valida e decodifica o token (reutiliza lógica do AuthGuard)
    const payload = this.jwtGuardService.extractValidateAndParse(req);
    
    // Valida se o token possui role_id (específico para RoleGuard)
    this.jwtGuardService.validateRoleRequired(payload);
    
    // Resolve rota e método da requisição
    const { path, method } = this.permissionsService.resolveRoute(req.url, req.method);
    
    // Valida permissões da role para o recurso solicitado
    await this.permissionsService.validatePermissions(payload.role_id!, path, method);
    
    // Adiciona payload na request para uso posterior
    req.user = payload;

    return true;
  }
}