import z from 'zod';

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

export const GetNearbyStationsSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180'),
  radius: z
    .number()
    .min(0.1, 'Raio deve ser pelo menos 0.1km')
    .max(100, 'Raio não pode ser maior que 100km')
    .default(10)
    .optional(),
  produto: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  limit: z
    .number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser pelo menos 1')
    .max(100, 'Limite não pode ser maior que 100 para busca por proximidade')
    .default(20)
    .optional(),
});

export const GetStationsByProductSchema = z.object({
  productName: z
    .string()
    .min(2, 'Nome do produto deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do produto deve ter no máximo 100 caracteres'),
  
  municipio: z
    .string()
    .min(2, 'Município deve ter pelo menos 2 caracteres')
    .max(100, 'Município deve ter no máximo 100 caracteres')
    .optional(),
  orderBy: z
    .enum(['price_asc', 'price_desc', 'date_desc'], {
      errorMap: () => ({ message: 'Ordenação deve ser price_asc, price_desc ou date_desc' })
    })
    .default('price_asc')
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

export const GetStationPriceHistorySchema = z.object({
  stationId: z
    .string()
    .uuid('ID do posto deve ser um UUID válido'),
  produto: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  startDate: z
    .date({
      errorMap: () => ({ message: 'Data inicial deve ser uma data válida' })
    })
    .optional(),
  endDate: z
    .date({
      errorMap: () => ({ message: 'Data final deve ser uma data válida' })
    })
    .optional(),
  limit: z
    .number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser pelo menos 1')
    .max(1000, 'Limite não pode ser maior que 1000')
    .default(100)
    .optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['startDate'],
  }
);

export const DownloadSpreadsheetSchema = z.object({
  url: z.string().url('URL deve ser válida'),
});