import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface ConversionResult {
  success: boolean;
  csvPath?: string;
  csvFileName?: string;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  emptyRows: number;
  duplicateRows: number;
}

export interface ProcessedFileInfo {
  csvPath: string;
  originalName: string;
  rowCount: number;
  columnCount: number;
  fileSize: number;
  headers: string[];
  validationResult: ValidationResult;
}

@Injectable()
export class XlsxToCsvConverterService {
  private readonly logger = new Logger(XlsxToCsvConverterService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp');

  async convertToCsv(xlsxPath: string): Promise<ConversionResult> {
    try {
      this.logger.log(`Converting XLSX to CSV: ${xlsxPath}`);

      // Read the XLSX file
      const workbook = XLSX.readFile(xlsxPath);
      
      // Get the first worksheet (ANP files typically have one main sheet)
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No worksheets found in the file');
      }

      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to CSV
      const csvData = XLSX.utils.sheet_to_csv(worksheet, {
        dateNF: 'yyyy-mm-dd', // Standardize date format
        blankrows: false,     // Skip blank rows
      });

      if (!csvData || csvData.trim().length === 0) {
        throw new Error('No data found in the worksheet');
      }

      // Generate unique CSV filename
      const csvFileName = `converted_${randomUUID()}.csv`;
      const csvPath = path.join(this.tempDir, csvFileName);

      // Write CSV file
      await fs.writeFile(csvPath, csvData, 'utf8');

      // Extract headers and count rows/columns
      const lines = csvData.trim().split('\n');
      const headers = this.parseCsvLine(lines[0]);
      const rowCount = lines.length - 1; // Exclude header row
      const columnCount = headers.length;

      this.logger.log(`Conversion successful: ${rowCount} rows, ${columnCount} columns`);

      return {
        success: true,
        csvPath,
        csvFileName,
        rowCount,
        columnCount,
        headers,
      };
    } catch (error) {
      this.logger.error(`XLSX to CSV conversion failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: `Conversion failed: ${error.message}`,
      };
    }
  }

  async validateCsvStructure(csvPath: string): Promise<ValidationResult> {
    try {
      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.trim().split('\n');
      
      const errors: string[] = [];
      const warnings: string[] = [];
      let emptyRows = 0;
      let duplicateRows = 0;

      if (lines.length < 2) {
        errors.push('CSV file must have at least a header row and one data row');
      }

      // Check for empty rows
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      emptyRows = lines.length - nonEmptyLines.length;

      // Check for duplicate rows (excluding header)
      const dataRows = lines.slice(1);
      const uniqueRows = new Set(dataRows);
      duplicateRows = dataRows.length - uniqueRows.size;

      // Validate header structure for ANP files
      if (lines.length > 0) {
        const headers = this.parseCsvLine(lines[0]);
        const expectedHeaders = [
          'Região - Sigla',
          'Estado - Sigla', 
          'Município',
          'Revenda',
          'CNPJ da Revenda',
          'Nome da Rua',
          'Número Rua',
          'Complemento',
          'Bairro',
          'Cep',
          'Produto',
          'Data da Coleta',
          'Valor de Venda',
          'Valor de Compra',
          'Unidade de Medida',
          'Bandeira'
        ];

        // Check if we have the minimum required headers
        const missingHeaders = expectedHeaders.filter(expected => 
          !headers.some(header => header.toLowerCase().includes(expected.toLowerCase().split(' ')[0]))
        );

        if (missingHeaders.length > 0) {
          warnings.push(`Cabeçalhos possivelmente ausentes: ${missingHeaders.join(', ')}`);
        }
      }

      if (emptyRows > 0) {
        warnings.push(`${emptyRows} linhas vazias encontradas`);
      }

      if (duplicateRows > 0) {
        warnings.push(`${duplicateRows} linhas duplicadas encontradas`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        emptyRows,
        duplicateRows,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        emptyRows: 0,
        duplicateRows: 0,
      };
    }
  }

  private parseCsvLine(line: string): string[] {
    // Simple CSV parser - handles quoted fields with commas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }
}