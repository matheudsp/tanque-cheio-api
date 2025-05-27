import { Injectable } from '@nestjs/common';
import {
  IFileValidator,
  type CsvRow,
  type ValidationResult,
} from '../interfaces/base.interface';

@Injectable()
export class CsvRowValidator implements IFileValidator<CsvRow> {
  validate(rows: CsvRow[]): ValidationResult[] {
    return rows.map((row, index) => this.validateSingleRow(row, index));
  }

  private validateSingleRow(row: CsvRow, index: number): ValidationResult {
    const errors: string[] = [];

    if (!this.isValidCnpj(row.CNPJ)) {
      errors.push(`Invalid CNPJ: ${row.CNPJ}`);
    }

    if (!this.isValidString(row.MUNICÍPIO)) {
      errors.push(`Invalid municipality: ${row.MUNICÍPIO}`);
    }

    if (!this.isValidString(row.PRODUTO)) {
      errors.push(`Invalid product: ${row.PRODUTO}`);
    }

    if (!this.isValidDate(row['DATA DA COLETA'])) {
      errors.push(`Invalid date: ${row['DATA DA COLETA']}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      rowIndex: index,
    };
  }

  private isValidCnpj(cnpj: string): boolean {
    if (!cnpj?.trim()) return false;
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  }

  private isValidString(value: string): boolean {
    return !!value?.trim() && value.trim() !== value.constructor.name;
  }

  private isValidDate(dateString: string): boolean {
    if (!dateString?.trim()) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}
