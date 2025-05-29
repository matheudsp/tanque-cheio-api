import { formatDateTimeDDMMYYYYHHmm } from '@/common/utils/formatDateTimeDDMMYYYYHHmm';

/**
 * Gera o nome do arquivo CSV a partir de um prefixo e de uma data.
 * Por padrão, usa a data corrente.
 *
 * @param prefix - Prefixo fixo, ex: "anp"
 * @param date   - Opcional: data a ser formatada. Se omitido, usa a data corrente.
 * @returns nome completo do arquivo, ex: "anp_05-03-2025.csv"
 */
export function generateCsvFileName(
  prefix: string,
  date: Date = new Date(),
): string {
  const formattedDate = formatDateTimeDDMMYYYYHHmm(date);
  return `${prefix}_${formattedDate}.csv`;
}