import { Injectable, Logger } from '@nestjs/common';
import {
  IFileProcessor,
  type ValidationResult,
} from '../interfaces/file-processor.interface';
import {
  CsvRow,
  ProcessingResult,
} from '../interfaces/file-processor.interface';
import { CsvRowValidator } from '../validators/csv-row.validator';
import { CsvToGasStationMapper } from '../mappers/csv-to-gas-station.mapper';
import { GasStationBatchRepository } from '../repositories/gas-station-batch.repository';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import type { GasStation } from '@/database/entity/gas-station.entity';
import * as path from 'path';

@Injectable()
export class CsvFileProcessor implements IFileProcessor<CsvRow> {
  private readonly logger = new Logger(CsvFileProcessor.name);

  constructor(
    private readonly validator: CsvRowValidator,
    private readonly mapper: CsvToGasStationMapper,
    private readonly repository: GasStationBatchRepository,
  ) {}

  async processFile(filePath: string): Promise<any> {
    try {
      const fileContent = this.readFile(filePath);
      const cleanedContent = this.preprocessContent(fileContent);
      const rows = await this.parseCSV(cleanedContent);
      const validRows = this.filterValidRows(rows);
      const entities = this.mapToEntities(validRows);

      return await this.repository.saveInBatches(entities);
    } catch (error) {
      this.logger.error('File processing failed:', error);
      throw error;
    }
  }

  validateRow(row: CsvRow): ValidationResult {
    return this.validator.validate([row])[0];
  }
  private readFile(filePath: string): string {
    // Construir o caminho completo corretamente
    const fullPath = this.buildFullPath(filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    this.logger.log(`Reading file from: ${fullPath}`);
    return fs.readFileSync(fullPath, 'utf8');
  }

  private buildFullPath(filePath: string): string {
    // Se o caminho já é absoluto, usar como está
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Se começa with '/', remove para evitar path duplo
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    // Construir caminho relativo ao diretório public
    return path.join(process.cwd(), 'public', cleanPath);
  }

  private preprocessContent(content: string): string {
    const lines = content.split('\n');
    const headerIndex = lines.findIndex(
      (line) =>
        line.includes('CNPJ') &&
        line.includes('RAZÃO') &&
        line.includes('FANTASIA'),
    );

    if (headerIndex === -1) {
      throw new Error('CSV header not found');
    }

    return lines
      .slice(headerIndex)
      .filter((line) => line.trim() && !line.match(/^,+$/))
      .join('\n');
  }

  private parseCSV(content: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRow>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (result) => resolve(result.data),
        error: (error) => reject(error),
      });
    });
  }

  private filterValidRows(rows: CsvRow[]): CsvRow[] {
    const validationResults = this.validator.validate(rows);
    return rows.filter((row, index) => validationResults[index].isValid);
  }

  private mapToEntities(rows: CsvRow[]): GasStation[] {
    return rows.map((row) => this.mapper.map(row));
  }
}
