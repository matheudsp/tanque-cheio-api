import z from 'zod';

export const DownloadSpreadsheetSchema = z.object({
  url: z.string().url('URL deve ser válida'),
});

export const SearchGasStationsSchema = z.object({
  municipio: z
    .string()
    .min(2, 'Município deve ter pelo menos 2 caracteres')
    .max(100, 'Município deve ter no máximo 100 caracteres')
    .optional(),
  produto: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  bandeira: z
    .string()
    .min(2, 'Bandeira deve ter pelo menos 2 caracteres')
    .max(100, 'Bandeira deve ter no máximo 100 caracteres')
    .optional(),
  limit: z
    .number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser pelo menos 1')
    .max(1000, 'Limite não pode ser maior que 1000')
    .default(50)
    .optional(),
  offset: z
    .number()
    .int('Offset deve ser um número inteiro')
    .min(0, 'Offset deve ser pelo menos 0')
    .default(0)
    .optional(),
});
