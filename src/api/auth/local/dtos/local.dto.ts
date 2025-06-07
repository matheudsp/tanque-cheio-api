import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Local Auth' })
export class LocalSignInDto {
  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    minLength: 8,
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'mySecurePassword123',
  })
  password: string;
}

@ApiSchema({ name: 'Refresh Token' })
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de refresh para renovar o access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;
}

@ApiSchema({ name: 'Logout' })
export class LogoutDto {
  @ApiProperty({
    description: 'Logout em todos os dispositivos',
    example: false,
    required: false,
  })
  logout_all?: boolean;
}

@ApiSchema({ name: 'Local Sign In Roles' })
export class LocalSignInRolesDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  user_id: string;

  @ApiProperty({
    description: 'ID da role do usuário',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  role_id: string;
}
