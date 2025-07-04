import { safeInputTextRegex } from '@/common/utils/lib';
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
    .refine((token) => {
      // Validação básica de formato JWT
      const parts = token.split('.');
      return parts.length === 3;
    }, 'Refresh token deve ter formato JWT válido'),
});

const signUpLocalSchema = z
  .object({
    name: z.string().min(1, { message: 'O nome é obrigatório' }),
    email: z.string().email({ message: 'Endereço de e-mail inválido' }),
    password: z
      .string()
      .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' }),
    passwordConfirmation: z
      .string()
      .min(8, { message: 'A confirmação da senha é obrigatória' }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'], // Indica qual campo recebe o erro
  });

type LocalAuthSchema = z.infer<typeof localAuthSchema>;
type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
type SignUpLocalSchema = z.infer<typeof signUpLocalSchema>;

export { localAuthSchema, signUpLocalSchema, refreshTokenSchema };
export type { LocalAuthSchema, SignUpLocalSchema, RefreshTokenSchema };
