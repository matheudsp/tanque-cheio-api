import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';


@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtGuardService: JwtGuardService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Extrai, valida e decodifica o token
    const payload = this.jwtGuardService.extractValidateAndParse(req);
    
    // Adiciona o payload do usuário na request para uso posterior
    req.user = payload;

    return true;
  }
}