import { z } from 'zod';

export const localizationCreateSchema = z.object({
  state: z.string().trim().min(1).max(50).optional(),
  city: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().max(500).optional().nullable(),
  number: z.string().trim().max(25).optional().nullable(),
  complement: z.string().trim().max(200).optional().nullable(),
  neighborhood: z.string().trim().max(200).optional().nullable(),
  zip_code: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{3}$/, {
      message: 'zip_code must be in the format 12345-678',
    })
    .optional()
    .nullable(),
  coordinates: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.coerce
        .number()
        .refine((v) => v >= -180 && v <= 180, { message: 'Invalid longitude' }),
      z.coerce
        .number()
        .refine((v) => v >= -90 && v <= 90, { message: 'Invalid latitude' }),
    ]),
  }),
});

export const localizationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
});

export type LocalizationCreateSchema = z.infer<typeof localizationCreateSchema>;
export type LocalizationQuerySchema = z.infer<typeof localizationQuerySchema>;
