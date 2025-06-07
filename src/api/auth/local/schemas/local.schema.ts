import { z } from 'zod';

const localAuthSchema = z.object({
  email: z
    .string()
    .email('E-mail deve ter um formato válido')
    .min(1, 'E-mail é obrigatório'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha não pode ter mais de 128 caracteres'),
});

const refreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .min(1, 'Refresh token é obrigatório')
    .refine(
      (token) => {
        // Validação básica de formato JWT
        const parts = token.split('.');
        return parts.length === 3;
      },
      'Refresh token deve ter formato JWT válido'
    ),
});

const logoutSchema = z.object({
  logout_all: z.boolean().optional().default(false),
});

const localAuthSchemaWithRole = z.object({
  user_id: z.string().uuid('ID do usuário deve ser um UUID válido'),
  role_id: z.string().uuid('ID da role deve ser um UUID válido'),
});

type LocalAuthSchema = z.infer<typeof localAuthSchema>;
type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
type LogoutSchema = z.infer<typeof logoutSchema>;
type LocalAuthSchemaWithRole = z.infer<typeof localAuthSchemaWithRole>;

export { 
  localAuthSchema, 
  refreshTokenSchema,
  logoutSchema,
  localAuthSchemaWithRole 
};

export type { 
  LocalAuthSchema, 
  RefreshTokenSchema,
  LogoutSchema,
  LocalAuthSchemaWithRole 
};