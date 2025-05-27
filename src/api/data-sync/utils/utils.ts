import type { CsvRow } from "../interfaces/processor.interface";

export class DataUtils {
  static cleanString(value: any): string {
    return value?.toString()?.trim() || '';
  }

  static normalizeCnpj(cnpj: string): string {
    if (!cnpj) throw new Error('CNPJ é obrigatório');
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) throw new Error(`CNPJ inválido: ${cnpj}`);
    return `${cleaned.substr(0, 2)}.${cleaned.substr(2, 3)}.${cleaned.substr(5, 3)}/${cleaned.substr(8, 4)}-${cleaned.substr(12)}`;
  }

  static normalizeCep(cep: string): string | null {
    if (!cep) return null;
    const cleaned = cep.replace(/[^\d]/g, '');
    return cleaned.length === 8 ? `${cleaned.substr(0, 5)}-${cleaned.substr(5)}` : null;
  }

  static parseDate(dateStr: string): Date {
    if (!dateStr) throw new Error('Data é obrigatória');
    
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
    ];

    for (const [index, format] of formats.entries()) {
      const match = dateStr.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        const [year, month, day] = index === 1 ? [p1, p2, p3] : [p3, p2, p1];
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new Error(`Data inválida: ${dateStr}`);
    return date;
  }

  static parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[R$\s]/g, '').replace(',', '.');
    const price = parseFloat(cleaned);
    return isNaN(price) || price < 0 ? null : price;
  }

  static isValidRow(row: CsvRow): boolean {
    return !!(
      row.CNPJ?.trim() &&
      row.MUNICÍPIO?.trim() &&
      row.PRODUTO?.trim() &&
      row.ESTADO?.trim() &&
      row['DATA DA COLETA']?.trim() &&
      row.RAZÃO?.trim() &&
      DataUtils.isValidCnpj(row.CNPJ)
    );
  }

  private static isValidCnpj(cnpj: string): boolean {
    if (!cnpj?.trim()) return false;
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  }
}