import type { CsvRow } from '../interfaces/csv-row.interface';

export class DataUtils {
  static cleanString(value: any): string {
    return value?.toString()?.trim() || '';
  }

  static normalizeCnpj(cnpj: string): string {
    if (!cnpj) throw new Error('CNPJ é obrigatório');
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) throw new Error(`CNPJ inválido ${cnpj}`);
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(8, 5)}/${cleaned.substring(12, 8)}-${cleaned.substring(12)}`;
  }

  static normalizeCep(cep: string): string | null {
    if (!cep) return null;
    const cleaned = cep.replace(/[^\d]/g, '');
    return cleaned.length === 8
      ? `${cleaned.substr(0, 5)}-${cleaned.substr(5)}`
      : null;
  }

  static parseDate(dateStr: string): Date {
    if (!dateStr) throw new Error('Data é obrigatória');

    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{2})-(\d{2})-(\d{4})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    ];

    for (const [index, format] of formats.entries()) {
      const match = dateStr.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        const [year, month, day] = index === 1 ? [p1, p2, p3] : [p3, p2, p1];

        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);

        // Validações básicas
        if (yearNum < 1900 || yearNum > 2100) {
          throw new Error(`Ano inválido: ${year}`);
        }
        if (monthNum < 1 || monthNum > 12) {
          throw new Error(`Mês inválido: ${month}`);
        }
        if (dayNum < 1 || dayNum > 31) {
          throw new Error(`Dia inválido: ${day}`);
        }

        const date = new Date(yearNum, monthNum - 1, dayNum);

        // Verificar se a data é válida (ex: 31/02 seria inválida)
        if (
          date.getFullYear() !== yearNum ||
          date.getMonth() !== monthNum - 1 ||
          date.getDate() !== dayNum
        ) {
          throw new Error(`Data inválida: ${dateStr}`);
        }

        return date;
      }
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new Error(`Data inválida: ${dateStr}`);
    return date;
  }

  static parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;

    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = priceStr.replace(/[R$\s]/g, '').replace(/[^\d,.-]/g, '');

    // Se está vazio após limpeza, retorna null
    if (!cleaned) return null;

    // Substitui vírgula por ponto para parseFloat
    const normalized = cleaned.replace(',', '.');
    const price = parseFloat(normalized);

    // Validações
    if (isNaN(price)) {
      console.warn(`Preço inválido encontrado: ${priceStr}`);
      return null;
    }

    if (price < 0) {
      console.warn(`Preço negativo encontrado: ${priceStr}`);
      return null;
    }
    return price;
  }

  static isValidRow(row: CsvRow): boolean {
    try {
      // Verificações básicas de campos obrigatórios
      if (!row.CNPJ?.trim()) return false;
      if (!row.MUNICÍPIO?.trim()) return false;
      if (!row.PRODUTO?.trim()) return false;
      if (!row.ESTADO?.trim()) return false;
      if (!row['DATA DA COLETA']?.trim()) return false;
      if (!row.RAZÃO?.trim()) return false;

      // Validação de CNPJ
      if (!DataUtils.isValidCnpj(row.CNPJ)) return false;

      // Validação de data
      try {
        DataUtils.parseDate(row['DATA DA COLETA']);
      } catch {
        return false;
      }

      // Validação de preço (se presente)
      if (row['PREÇO DE REVENDA']?.trim()) {
        const price = DataUtils.parsePrice(row['PREÇO DE REVENDA']);
        if (price === null || price <= 0) return false;
      }

      return true;
    } catch (error) {
      console.warn(`Erro na validação da linha:`, error);
      return false;
    }
  }

  private static isValidCnpj(cnpj: string): boolean {
    if (!cnpj?.trim()) return false;
    const cleaned = cnpj.replace(/[^\d]/g, '');

    // Deve ter exatamente 14 dígitos
    if (cleaned.length !== 14) return false;

    // Não pode ser sequência de números iguais
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    return true;
  }
}
