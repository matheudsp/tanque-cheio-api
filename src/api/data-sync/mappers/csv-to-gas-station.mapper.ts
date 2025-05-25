import { Injectable } from '@nestjs/common';
import { IDataMapper, type CsvRow } from '../interfaces/file-processor.interface';

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
    // Multiple date format support
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // M/D/YYYY or DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/        // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        const date = new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1));
        if (!isNaN(date.getTime())) return date;
      }
    }

    return new Date(dateString);
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
      row.COMPLEMENTO?.trim()
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }
}