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
  lat: z
    .coerce.number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90')
    .refine((val) => !isNaN(val), 'Latitude deve ser um número válido'),
  lng: z
    .coerce.number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180')
    .refine((val) => !isNaN(val), 'Longitude deve ser um número válido'),
  radius: z
    .coerce.number()
    .int('Raio deve ser um número inteiro')
    .min(1, 'Raio deve ser pelo menos 1 km')
    .max(1000, 'Raio não pode ser maior que 250 km'),
  product: z
    .string()
    .min(2, 'Produto deve ter pelo menos 2 caracteres')
    .max(100, 'Produto deve ter no máximo 100 caracteres')
    .optional()
    .transform((val) => val?.trim()),
  sortBy: z
    .enum(['distanceAsc','distanceDesc', 'priceAsc', 'priceDesc'])
    .default('distanceAsc')
    .optional(),
  limit: z
    .coerce.number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser pelo menos 1')
    .max(10, 'Limite não pode ser maior que 10 para busca por proximidade')
    .default(50)
    .optional(),
  offset: z
    .coerce.number()
    .int('Offset deve ser um número inteiro')
    .min(0, 'Offset deve ser pelo menos 0')
    .default(0)
    .optional(),
});


// Schema para busca por ID
const getStationByIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
});



type SearchGasStationsQuerySchema = z.infer<typeof searchGasStationsQuerySchema>;
type GetNearbyStationsSchema = z.infer<typeof getNearbyStationsSchema>;
type GetStationByIdSchema = z.infer<typeof getStationByIdSchema>;



// Exports
export {
  searchGasStationsQuerySchema,
  getNearbyStationsSchema,
  getStationByIdSchema,

};

export type {
  SearchGasStationsQuerySchema,
  GetNearbyStationsSchema,

  GetStationByIdSchema,
};