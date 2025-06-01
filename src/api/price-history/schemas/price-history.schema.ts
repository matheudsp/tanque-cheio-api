import { z } from 'zod';

// ================ VALIDATION SCHEMAS ================

const periodQuerySchema = z
  .object({
    startDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Data de início deve estar no formato YYYY-MM-DD',
      )
      .refine((date) => !isNaN(Date.parse(date)), 'Data de início inválida'),

    endDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Data de fim deve estar no formato YYYY-MM-DD',
      )
      .refine((date) => !isNaN(Date.parse(date)), 'Data de fim inválida'),

    product: z
      .string()
      .min(1, 'Nome do produto não pode estar vazio')
      .optional()
      .transform((val) => val?.toUpperCase()),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start <= end;
    },
    {
      message: 'Data de início deve ser anterior ou igual à data de fim',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 365; // Máximo 1 ano
    },
    {
      message: 'Período não pode ser maior que 365 dias',
      path: ['endDate'],
    },
  );

const stationParamSchema = z.object({
  stationId: z.string().uuid('ID do posto deve ser um UUID válido'),
});

// ================ RESPONSE SCHEMAS ================

const priceItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  price: z.number().positive('Preço deve ser positivo'),
  date: z.string(),
  unit: z.string().default('L'),
  variation: z.number().optional(),
  variationPercent: z.number().optional(),
});

const latestPricesResponseSchema = z.object({
  stationId: z.string().uuid(),
  prices: z.array(priceItemSchema),
  totalProducts: z.number().int().positive(),
  updatedAt: z.string(),
});

const historyResponseSchema = z.object({
  stationId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  product: z.string().optional(),
  prices: z.array(priceItemSchema),
  total: z.number().int(),
  queryTime: z.string(),
});

// ================ TYPE EXPORTS ================

type PeriodQueryType = z.infer<typeof periodQuerySchema>;
type StationParamType = z.infer<typeof stationParamSchema>;
type PriceItemType = z.infer<typeof priceItemSchema>;
type LatestPricesResponseType = z.infer<typeof latestPricesResponseSchema>;
type HistoryResponseType = z.infer<typeof historyResponseSchema>;

export {
  periodQuerySchema,
  stationParamSchema,
  priceItemSchema,
  latestPricesResponseSchema,
  historyResponseSchema,
};

export type {
  PeriodQueryType,
  StationParamType,
  PriceItemType,
  LatestPricesResponseType,
  HistoryResponseType,
};
