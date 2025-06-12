import { z } from 'zod';

const localizationCreateSchema = z.object({
  state: z
    .string()
    .trim()
    .min(1, { message: 'state não pode ser vazio' })
    .max(50, { message: 'state deve ter no máximo 50 caracteres' })
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, { message: 'city não pode ser vazio' })
    .max(200, { message: 'city deve ter no máximo 200 caracteres' })
    .optional(),

  address: z
    .string()
    .trim()
    .max(500, { message: 'address deve ter no máximo 500 caracteres' })
    .optional()
    .nullable(),

  number: z
    .string()
    .trim()
    .max(25, { message: 'number deve ter no máximo 25 caracteres' })
    .optional()
    .nullable(),

  complement: z
    .string()
    .trim()
    .max(200, { message: 'complement deve ter no máximo 200 caracteres' })
    .optional()
    .nullable(),

  neighborhood: z
    .string()
    .trim()
    .max(200, { message: 'neighborhood deve ter no máximo 200 caracteres' })
    .optional()
    .nullable(),

  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{3}$/, { message: 'zipCode deve ter formato 12345-678' })
    .optional()
    .nullable(),

  // latitude e longitude: usamos z.coerce.number() para transformar string numérica automaticamente.
  // Se vier valor inválido (ex: texto não numérico), a validação irá falhar.
  // latitude: z.coerce
  //   .number({ invalid_type_error: 'latitude deve ser um número' })
  //   .refine((val) => val >= -90 && val <= 90, {
  //     message: 'latitude deve estar entre -90 e 90',
  //   })
  //   .optional()
  //   .nullable(),

  // longitude: z.coerce
  //   .number({ invalid_type_error: 'longitude deve ser um número' })
  //   .refine((val) => val >= -180 && val <= 180, {
  //     message: 'longitude deve estar entre -180 e 180',
  //   })
  //   .optional()
  //   .nullable(),
  coordinates: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.coerce.number().refine((v) => v >= -180 && v <= 180, {
        message: 'longitude inválido',
      }),
      z.coerce
        .number()
        .refine((v) => v >= -90 && v <= 90, { message: 'latitude inválido' }),
    ]),
  }),
});

type LocalizationCreateSchema = z.infer<typeof localizationCreateSchema>;
export type { LocalizationCreateSchema };
export { localizationCreateSchema };
