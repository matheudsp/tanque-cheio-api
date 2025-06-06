import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type Payload = {
  user_id: string;
  role_id: string | null;
  iat: number;
  exp: number;
};

@Injectable()
export class JwtAuthService {
  private token: string;
  constructor(private readonly jwt: JwtService) {}
  
  setToken(token: string) {
    this.token = token;
  }

  getPayload(): Payload | null {
    if (!this.token) {
      return null;
    }
    
    try {
      const payload: Payload = this.jwt.decode(this.token);
      return payload;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  getToken(): string {
    return this.token;
  }
}