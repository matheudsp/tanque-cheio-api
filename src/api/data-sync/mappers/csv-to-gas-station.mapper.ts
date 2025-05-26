import { Injectable } from '@nestjs/common';
import {
  IDataMapper,
  type CsvRow,
} from '../interfaces/file-processor.interface';

import { GasStation } from '@/database/entity/gas-station.entity';
import { Localizacao } from '@/database/entity/location.entity';
import { Produto } from '@/database/entity/product.entity';

@Injectable()
export class CsvToGasStationMapper implements IDataMapper<CsvRow, GasStation> {
  map(csvRow: CsvRow): GasStation {
    const gasStation = new GasStation();

    // Dados do posto
    gasStation.cnpj = this.formatCnpj(csvRow.CNPJ);
    gasStation.nome = this.getStationName(csvRow);
    gasStation.bandeira = csvRow.BANDEIRA?.trim() || null;
    gasStation.data_coleta = this.parseDate(csvRow['DATA DA COLETA']);
    gasStation.preco_venda = this.parsePrice(csvRow['PREÇO DE REVENDA']);
    gasStation.preco_compra = this.parsePrice(csvRow['PREÇO DE COMPRA']) || null;

    // Criar localização
    const localizacao = new Localizacao();
    localizacao.regiao_sigla = csvRow.REGIÃO?.trim() || null;
    localizacao.uf = csvRow.ESTADO?.trim().toUpperCase();
    localizacao.municipio = csvRow.MUNICÍPIO?.trim();
    localizacao.endereco = this.buildAddress(csvRow);
    localizacao.bairro = csvRow.BAIRRO?.trim() || null;
    localizacao.cep = csvRow.CEP?.trim() || null;
    
    gasStation.localizacao = localizacao;

    // Criar produto
    const produto = new Produto();
    produto.nome = csvRow.PRODUTO?.trim();
    produto.unidade_medida = csvRow['UNIDADE DE MEDIDA']?.trim() || 
                            Produto.determineUnit(csvRow.PRODUTO?.trim() || '');
    produto.ativo = true;
    
    gasStation.produto = produto;

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

    const cleanDate = dateString.trim();

    const formats = [
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parser: (match: RegExpMatchArray) => {
          const [, month, day, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
      {
        regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
        parser: (match: RegExpMatchArray) => {
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
      {
        regex: /^(\d{4})-(\d{2})-(\d{2})$/,
        parser: (match: RegExpMatchArray) => {
          const [, year, month, day] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        },
      },
    ];

    for (const format of formats) {
      const match = cleanDate.match(format.regex);
      if (match) {
        const date = format.parser(match);
        if (!isNaN(date.getTime())) {
          const currentYear = new Date().getFullYear();
          const dateYear = date.getFullYear();
          if (dateYear >= 2000 && dateYear <= currentYear + 10) {
            return date;
          }
        }
      }
    }

    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      const [part1, part2, part3] = parts.map((p) => parseInt(p));
      if (part3 >= 2020 && part3 <= 2030) {
        if (part1 <= 12 && part2 <= 31 && part2 > 12) {
          return new Date(part3, part1 - 1, part2);
        } else if (part2 <= 12 && part1 <= 31 && part1 > 12) {
          return new Date(part3, part2 - 1, part1);
        } else if (part1 <= 12 && part2 <= 31) {
          return new Date(part3, part1 - 1, part2);
        }
      }
    }

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