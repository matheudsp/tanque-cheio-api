import { Injectable } from '@nestjs/common';
import {
  IDataMapper,
  type CsvRow,
} from '../interfaces/file-processor.interface';

import { GasStation } from '@/database/entity/gas-station.entity';

@Injectable()
export class CsvToGasStationMapper implements IDataMapper<CsvRow, GasStation> {
  map(csvRow: CsvRow): GasStation {
    const gasStation = new GasStation();

    gasStation.cnpj = this.formatCnpj(csvRow.CNPJ);
    gasStation.uf = csvRow.ESTADO?.trim().toUpperCase();
    gasStation.municipio = csvRow.MUNICÍPIO?.trim();
    gasStation.nome = this.getStationName(csvRow);
    gasStation.produto = csvRow.PRODUTO?.trim();
    gasStation.data_coleta = this.parseDate(csvRow['DATA DA COLETA']);
    gasStation.preco_venda = this.parsePrice(csvRow['PREÇO DE REVENDA']);
    gasStation.bandeira = csvRow.BANDEIRA?.trim() || null;
    gasStation.unidade_medida = csvRow['UNIDADE DE MEDIDA']?.trim() || null;
    gasStation.endereco = this.buildAddress(csvRow);
    gasStation.bairro = csvRow.BAIRRO?.trim() || null;
    gasStation.cep = csvRow.CEP?.trim() || null;

    return gasStation;
  }

  private formatCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }

  private getStationName(row: CsvRow): string {
    return row.FANTASIA?.trim() || row.RAZÃO?.trim();
  }

  private parseDate(dateString: string): Date {
    if (!dateString?.trim()) {
      throw new Error('Data da coleta é obrigatória');
    }

    // Limpar espaços e caracteres indesejados
    const cleanDate = dateString.trim();

    // Tentar diferentes formatos de data
    const formats = [
      // Formato M/D/YYYY (como aparece no CSV: 5/19/2025)
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parser: (match: RegExpMatchArray) => {
          const [, month, day, year] = match;
          // No formato americano M/D/YYYY
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
      // Formato DD/MM/YYYY (formato brasileiro)
      {
        regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
        parser: (match: RegExpMatchArray) => {
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
      // Formato YYYY-MM-DD (ISO)
      {
        regex: /^(\d{4})-(\d{2})-(\d{2})$/,
        parser: (match: RegExpMatchArray) => {
          const [, year, month, day] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
    ];

    // Tentar cada formato
    for (const format of formats) {
      const match = cleanDate.match(format.regex);
      if (match) {
        const date = format.parser(match);

        // Validar se a data é válida
        if (!isNaN(date.getTime())) {
          // Verificar se a data faz sentido (não é muito antiga nem muito futura)
          const currentYear = new Date().getFullYear();
          const dateYear = date.getFullYear();

          if (dateYear >= 2000 && dateYear <= currentYear + 10) {
            return date;
          }
        }
      }
    }

    // Se nenhum formato funcionou, tentar detectar automaticamente
    // Baseado no padrão do CSV (dados de 2025)
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      const [part1, part2, part3] = parts.map((p) => parseInt(p));

      // Se o terceiro valor é um ano válido (2020-2030)
      if (part3 >= 2020 && part3 <= 2030) {
        // Detectar se é M/D/YYYY ou D/M/YYYY baseado nos valores
        if (part1 <= 12 && part2 <= 31 && part2 > 12) {
          // Provavelmente M/D/YYYY (mês <= 12, dia > 12)
          return new Date(part3, part1 - 1, part2);
        } else if (part2 <= 12 && part1 <= 31 && part1 > 12) {
          // Provavelmente D/M/YYYY (dia > 12, mês <= 12)
          return new Date(part3, part2 - 1, part1);
        } else if (part1 <= 12 && part2 <= 31) {
          // Ambos são válidos como mês/dia, assumir formato americano M/D/YYYY
          // (baseado no padrão do arquivo ANP)
          return new Date(part3, part1 - 1, part2);
        }
      }
    }

    // Como último recurso, tentar o construtor padrão do Date
    const fallbackDate = new Date(cleanDate);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    throw new Error(`Formato de data não reconhecido: ${dateString}`);
  }

  private parsePrice(priceString: string): number | null {
    if (!priceString?.trim()) return null;

    const cleaned = priceString
      .replace(/[R$\s]/g, '')
      .replace(/,(\d{2})$/, '.$1')
      .replace(/,/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed < 0 ? null : parsed;
  }

  private buildAddress(row: CsvRow): string | null {
    const parts = [
      row.ENDEREÇO?.trim(),
      row.NÚMERO?.trim(),
      row.COMPLEMENTO?.trim(),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  }
}
