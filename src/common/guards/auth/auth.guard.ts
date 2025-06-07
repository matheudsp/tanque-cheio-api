import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/interfaces/jwt-payload';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.getBearerToken(req);
    const payload = this.parseToken(token);

    // Adiciona o payload do usuário na request para uso posterior
    req.user = payload;

    return true;
  }

  private getBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Token de autorização ausente');
    }

    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token || token.length < 50) {
      throw new UnauthorizedException('Formato de autorização inválido ou token muito curto');
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
      if (name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token malformado');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }

  private parseToken(token: string): JwtPayload {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.user_id ||
      !decoded.iat ||
      !decoded.exp
    ) {
      throw new UnauthorizedException('Token inválido ou incompleto');
    }
    return decoded;
  }
}