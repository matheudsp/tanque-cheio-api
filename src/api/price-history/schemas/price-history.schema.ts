import { z } from 'zod';

const priceHistorySchema = z.object({
  id: z.string().uuid(),
  data_coleta: z.string().date(),
  preco_venda: z.number(),
  ativo: z.boolean().default(true),
  atualizadoEm: z.string().date(),
  criadoEm: z.string().date(),
});
const priceHistoryQuerySchema = z
  .object({
    produto_id: z.string().uuid('ID do produto deve ser um UUID válido'),
    dataInicio: z
      .date({
        errorMap: () => ({ message: 'Data inicial deve ser uma data válida' }),
      })
      .optional(),
    dataFim: z
      .date({
        errorMap: () => ({ message: 'Data final deve ser uma data válida' }),
      })
      .optional(),
    limite: z
      .number()
      .int('Limite deve ser um número inteiro')
      .min(1, 'Limite deve ser pelo menos 1')
      .max(1000, 'Limite não pode ser maior que 1000')
      .default(100)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.dataInicio && data.dataFim) {
        return data.dataInicio <= data.dataFim;
      }
      return true;
    },
    {
      message: 'Data inicial deve ser anterior ou igual à data final',
      path: ['startDate'],
    },
  );
const latestPricesQuerySchema = z.object({
  periodo: z.enum(['semana', 'mes']).default('mes').optional(),
  produtos: z.string().optional().transform((val) => 
    val ? val.split(',').map(p => p.trim().toUpperCase()) : ['GLP', 'GASOLINA', 'DIESEL']
  ),
});

type LatestPricesQuerySchema = z.infer<typeof latestPricesQuerySchema>;
type PriceHistorySchema = z.infer<typeof priceHistorySchema>;
type PriceHistoryQuerySchema = z.infer<typeof priceHistoryQuerySchema>;
export { priceHistorySchema, latestPricesQuerySchema,priceHistoryQuerySchema };
export type { LatestPricesQuerySchema,PriceHistorySchema, PriceHistoryQuerySchema };
