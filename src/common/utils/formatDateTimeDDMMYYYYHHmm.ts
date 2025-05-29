/**
 * Retorna a data (ou data fornecida) no formato "DD-MM-YYYY_HH-mm".
 * @param date - Opcional. Se não informado, usa a data corrente.
 * @returns string no formato "DD-MM-YYYY_HH-mm".
 */
export function formatDateTimeDDMMYYYYHHmm(date: Date = new Date()): string {
  const day    = String(date.getDate()).padStart(2, '0');         // dia: 01–31
  const month  = String(date.getMonth() + 1).padStart(2, '0');    // mês: 01–12
  const year   = date.getFullYear();                              // ex.: 2025

  const hours   = String(date.getHours()).padStart(2, '0');       // hora: 00–23
  const minutes = String(date.getMinutes()).padStart(2, '0');     // minuto: 00–59

  return `${day}-${month}-${year}_${hours}-${minutes}`;
}