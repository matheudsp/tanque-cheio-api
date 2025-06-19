import { z } from 'zod';

// ================ VALIDATION SCHEMAS ================

const periodQuerySchema = z
  .object({
    start_date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Data de início deve estar no formato YYYY-MM-DD',
      )
      .refine((date) => !isNaN(Date.parse(date)), 'Data de início inválida'),

    end_date: z
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
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return start <= end;
    },
    {
      message: 'Data de início deve ser anterior ou igual à data de fim',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
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
  station_id: z.string().uuid('ID do posto deve ser um UUID válido'),
});




// ================ TYPE EXPORTS ================

type PeriodQueryType = z.infer<typeof periodQuerySchema>;
type StationParamType = z.infer<typeof stationParamSchema>;


export {
  periodQuerySchema,
  stationParamSchema,

};

export type {
  PeriodQueryType,
  StationParamType,

};