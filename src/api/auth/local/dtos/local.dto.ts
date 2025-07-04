import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Forgot Password' })
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'E-mail do usuário que esqueceu a senha',
    example: 'usuario@exemplo.com',
  })
  email: string;
}

@ApiSchema({ name: 'Reset Password with Code' })
export class ResetPasswordDto {
  @ApiProperty({
    description: 'E-mail do usuário que está redefinindo a senha',
    example: 'usuario@exemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'O código de 6 dígitos recebido por e-mail',
    example: '123456',
  })
  code: string;

  @ApiProperty({
    minLength: 8,
    description: 'A nova senha do usuário',
    example: 'NovaSenha@123',
  })
  password: string;

  @ApiProperty({
    minLength: 8,
    description: 'Confirmação da nova senha',
    example: 'NovaSenha@123',
  })
  passwordConfirmation: string;
}

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

@ApiSchema({ name: 'Local Sign Up' })
export class LocalSignUpDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João da Silva',
  })
  name: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    minLength: 8,
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'SenhaForte@123',
  })
  password: string;

  @ApiProperty({
    minLength: 8,
    description: 'Confirmação da senha do usuário',
    example: 'SenhaForte@123',
  })
  passwordConfirmation: string;
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
