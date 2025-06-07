import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/interfaces/jwt-payload';

@Injectable()
export class JwtGuardService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Extrai e valida o token Bearer do cabeçalho Authorization
   */
  extractAndValidateToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Token de autorização ausente');
    }

    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token || token.length < 50) {
      throw new UnauthorizedException('Formato de autorização inválido ou token muito curto');
    }

    this.verifyToken(token);
    return token;
  }

  /**
   * Verifica a validade do token JWT
   */
  private verifyToken(token: string): void {
    try {
      this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        audience: 'api-client',
        issuer: 'auth-service',
      });
    } catch (err: any) {
      this.handleTokenError(err);
    }
  }

  /**
   * Decodifica o token e valida sua estrutura
   */
  parseAndValidatePayload(token: string): JwtPayload {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    
    if (!decoded || typeof decoded !== 'object') {
      throw new UnauthorizedException('Token inválido');
    }

    // Validação básica obrigatória para todos os tokens
    if (!decoded.user_id || !decoded.iat || !decoded.exp) {
      throw new UnauthorizedException('Token inválido ou incompleto');
    }

    return decoded;
  }

  /**
   * Extrai, valida e decodifica o token em uma única operação
   */
  extractValidateAndParse(req: Request): JwtPayload {
    const token = this.extractAndValidateToken(req);
    return this.parseAndValidatePayload(token);
  }

  /**
   * Valida se o payload possui role_id (necessário para guards que requerem role)
   */
  validateRoleRequired(payload: JwtPayload): void {
    if (!payload.role_id) {
      throw new UnauthorizedException('Token inválido: role não definida');
    }
  }

  /**
   * Trata erros específicos do JWT
   */
  private handleTokenError(err: any): never {
    const errorMap = {
      'TokenExpiredError': 'Token expirado',
      'NotBeforeError': 'Token ainda não é válido',
      'JsonWebTokenError': 'Token malformado'
    };

    const message = errorMap[err.name] || 'Token inválido';
    throw new UnauthorizedException(message);
  }
}