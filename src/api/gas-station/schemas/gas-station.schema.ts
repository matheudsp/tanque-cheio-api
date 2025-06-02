import { z } from 'zod';

// Schema para busca geral de postos
const searchGasStationsQuerySchema = z.object({
  city: z
    .string()
    .min(2, 'Cidade/Município deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade/Município deve ter no máximo 100 caracteres')
    .optional(),
  product: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  brand: z
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

// Schema para busca por proximidade
const getNearbyStationsSchema = z.object({
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
  product: z
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

// Schema para histórico de preços
const getPriceHistorySchema = z.object({
  stationId: z.string().uuid('ID do posto deve ser um UUID válido'),
  product: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  limit: z
    .number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser pelo menos 1')
    .max(500, 'Limite não pode ser maior que 500')
    .default(50)
    .optional(),
  startDate: z
    .string()
    .datetime('Data de início deve estar no formato ISO')
    .optional(),
  endDate: z
    .string()
    .datetime('Data de fim deve estar no formato ISO')
    .optional(),
});

// Schema para busca por ID
const getStationByIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

// Schema para download de planilha
const downloadSpreadsheetSchema = z.object({
  url: z.string().url('URL deve ser válida'),
});

// Schema para filtros avançados
const advancedSearchSchema = z.object({
  state: z
    .string()
    .min(2, 'UF deve ter pelo menos 2 caracteres')
    .max(100, 'UF deve ter no máximo 100 caracteres')
    .optional(),
  city: z
    .string()
    .min(2, 'Município deve ter pelo menos 2 caracteres')
    .max(100, 'Município deve ter no máximo 100 caracteres')
    .optional(),
  product: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional(),
  brand: z
    .string()
    .min(2, 'Bandeira deve ter pelo menos 2 caracteres')
    .max(100, 'Bandeira deve ter no máximo 100 caracteres')
    .optional(),
  orderBy: z
    .enum(['name_asc', 'name_desc', 'price_asc', 'price_desc', 'date_desc'])
    .default('name_asc')
    .optional(),
  priceMin: z
    .number()
    .min(0, 'Preço mínimo deve ser maior que 0')
    .optional(),
  priceMax: z
    .number()
    .min(0, 'Preço máximo deve ser maior que 0')
    .optional(),
  hasCurrentPrice: z.boolean().optional(),
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

// Tipos TypeScript inferidos dos schemas
type SearchGasStationsQuerySchema = z.infer<typeof searchGasStationsQuerySchema>;
type GetNearbyStationsSchema = z.infer<typeof getNearbyStationsSchema>;
type GetPriceHistorySchema = z.infer<typeof getPriceHistorySchema>;
type GetStationByIdSchema = z.infer<typeof getStationByIdSchema>;
type DownloadSpreadsheetSchema = z.infer<typeof downloadSpreadsheetSchema>;
type AdvancedSearchSchema = z.infer<typeof advancedSearchSchema>;

// Exports
export {
  searchGasStationsQuerySchema,
  getNearbyStationsSchema,
  getPriceHistorySchema,
  getStationByIdSchema,
  downloadSpreadsheetSchema,
  advancedSearchSchema,
};

export type {
  SearchGasStationsQuerySchema,
  GetNearbyStationsSchema,
  GetPriceHistorySchema,
  GetStationByIdSchema,
  DownloadSpreadsheetSchema,
  AdvancedSearchSchema,
};