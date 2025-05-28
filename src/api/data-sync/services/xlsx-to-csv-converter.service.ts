import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { CsvRow } from '../interfaces/csv-row.interface';
import type { ConversionResult, ValidationResult } from '../interfaces/xlsx-to-csv.interface';

@Injectable()
export class XlsxToCsvConverterService {
  private readonly logger = new Logger(XlsxToCsvConverterService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp');

  constructor() {
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log(`Created temp directory: ${this.tempDir}`);
    }
  }

  // Função auxiliar para verificar se um valor é uma data serial do Excel
  private isExcelDateSerial(value: any): boolean {
    return typeof value === 'number' && value > 1 && value < 2958466; // Range válido para datas Excel
  }

  // Função auxiliar para converter data serial do Excel para MM/DD/YYYY
  private convertExcelSerialToDate(serial: number): string {
    try {
      // Excel conta a partir de 1/1/1900, mas tem um bug onde considera 1900 como ano bissexto
      const excelEpoch = new Date(1900, 0, 1);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      
      // Ajuste para o bug do Excel (dia 60 = 29/02/1900 que não existe)
      let adjustedSerial = serial;
      if (serial >= 60) {
        adjustedSerial = serial - 1;
      }
      
      const date = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * millisecondsPerDay);
      
      // Formatar como MM/DD/YYYY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    } catch (error) {
      this.logger.warn(`Failed to convert Excel serial ${serial} to date: ${error.message}`);
      return String(serial);
    }
  }

  // Função auxiliar para verificar se uma coluna pode ser de data baseada no cabeçalho
  private isDateColumn(header: string): boolean {
    const dateKeywords = ['data', 'date', 'coleta', 'created', 'updated', 'nascimento', 'vencimento'];
    const headerLower = header.toLowerCase();
    return dateKeywords.some(keyword => headerLower.includes(keyword));
  }

  async convertToCsv(xlsxPath: string): Promise<ConversionResult> {
    try {
      this.logger.log(`Converting XLSX to CSV: ${xlsxPath}`);

      // Verificar se o arquivo existe
      await fs.access(xlsxPath);

      // Ler o arquivo XLSX preservando formato original
      const workbook = XLSX.readFile(xlsxPath, {
        type: 'file',
        cellText: false,     // Desabilitar para ter controle manual
        cellDates: false,    // Não converter datas automaticamente
        cellNF: false,       // Desabilitar formatação automática
        cellStyles: true,    // Preservar estilos para acessar formatação
        sheetStubs: true,    // Incluir células vazias
        raw: false,          // Não usar apenas valores brutos
        dateNF: 'mm/dd/yyyy' // Formato padrão para datas se necessário
      });
      
      // Obter a primeira planilha
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No worksheets found in the file');
      }

      const worksheet = workbook.Sheets[sheetName];
      
      // Obter o range da planilha
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Encontrar a linha de cabeçalho procurando por 'CNPJ'
      let headerRowIndex = -1;
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          if (cell && String(cell.v).trim().toUpperCase() === 'CNPJ') {
            headerRowIndex = row;
            break;
          }
        }
        if (headerRowIndex !== -1) break;
      }

      if (headerRowIndex === -1) {
        throw new Error('Header row with CNPJ not found in the file');
      }

      // Extrair cabeçalhos
      const headers: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
        const cell = worksheet[cellAddress];
        headers.push(cell ? String(cell.v).trim() : '');
      }

      // Filtrar colunas vazias do cabeçalho
      const validColumns: number[] = [];
      headers.forEach((header, index) => {
        if (header && header.trim() !== '') {
          validColumns.push(index);
        }
      });

      const filteredHeaders = validColumns.map(col => headers[col]);

      // Identificar colunas de data baseadas nos cabeçalhos
      const dateColumnIndexes = new Set<number>();
      filteredHeaders.forEach((header, index) => {
        if (this.isDateColumn(header)) {
          dateColumnIndexes.add(validColumns[index]);
        }
      });

      // Extrair dados das linhas
      const dataRows: string[][] = [];
      for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
        const rowData: string[] = [];
        let hasData = false;

        for (let i = 0; i < validColumns.length; i++) {
          const colIndex = validColumns[i];
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
          const cell = worksheet[cellAddress];
          
          let cellValue = '';
          if (cell) {
            // Verificar se é uma coluna de data e o valor é um serial do Excel
            if (dateColumnIndexes.has(colIndex) && this.isExcelDateSerial(cell.v)) {
              cellValue = this.convertExcelSerialToDate(cell.v);
            }
            // Tratamento especial para CNPJ (manter formatação existente)
            else if (filteredHeaders[i] && filteredHeaders[i].toUpperCase() === 'CNPJ') {
              if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== '') {
                // Priorizar texto formatado - preserva formatação visual como CNPJ
                cellValue = String(cell.w).trim();
              } else if (cell.v !== undefined && cell.v !== null) {
                // Para números que podem ser CNPJ (14 dígitos)
                const rawValue = String(cell.v);
                if (/^\d{11,14}$/.test(rawValue) && rawValue.length >= 11) {
                  // Pode ser CNPJ sem formatação - tentar formatar
                  const paddedValue = rawValue.padStart(14, '0');
                  if (paddedValue.length === 14) {
                    cellValue = `${paddedValue.substring(0,2)}.${paddedValue.substring(2,5)}.${paddedValue.substring(5,8)}/${paddedValue.substring(8,12)}-${paddedValue.substring(12,14)}`;
                  } else {
                    cellValue = rawValue;
                  }
                } else {
                  cellValue = rawValue.trim();
                }
              }
            }
            // Tratamento geral para outras colunas
            else {
              if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== '') {
                // Priorizar texto formatado
                cellValue = String(cell.w).trim();
              } else if (cell.t === 's') {
                // Célula de texto - usar valor original
                cellValue = String(cell.v).trim();
              } else if (cell.v !== undefined && cell.v !== null) {
                cellValue = String(cell.v).trim();
              }
            }
            
            if (cellValue !== '') {
              hasData = true;
            }
          }
          
          rowData.push(cellValue);
        }

        // Apenas adicionar linhas que têm pelo menos um dado
        if (hasData) {
          dataRows.push(rowData);
        }
      }

      // Gerar nome único para o arquivo CSV
      const csvFileName = `converted_${randomUUID()}.csv`;
      const csvPath = path.join(this.tempDir, csvFileName);

      // Construir dados para CSV
      const csvData = [filteredHeaders, ...dataRows];
      const csvContent = this.convertJsonToCsv(csvData);
      
      // Salvar arquivo CSV
      await fs.writeFile(csvPath, csvContent, 'utf8');

      const rowCount = dataRows.length;
      const columnCount = filteredHeaders.length;

      this.logger.log(
        `XLSX converted successfully: ${csvFileName} (${rowCount} rows, ${columnCount} columns)`
      );

      // Log das colunas identificadas como data para debug
      if (dateColumnIndexes.size > 0) {
        const dateColumns = filteredHeaders.filter((_, index) => 
          dateColumnIndexes.has(validColumns[index])
        );
        this.logger.log(`Date columns identified: ${dateColumns.join(', ')}`);
      }

      return {
        success: true,
        csvPath,
        csvFileName,
        rowCount,
        columnCount,
        headers: filteredHeaders,
      };

    } catch (error) {
      this.logger.error(`XLSX conversion failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: `Conversion failed: ${error.message}`,
      };
    }
  }

  private convertJsonToCsv(data: string[][]): string {
    return data
      .map(row => 
        row.map(cell => {
          const cellValue = String(cell || '');
          
          // Escapar aspas duplas e envolver em aspas se necessário
          if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"') || cellValue.includes(';')) {
            return `"${cellValue.replace(/"/g, '""')}"`;
          }
          
          return cellValue;
        }).join(',')
      )
      .join('\n');
  }

  async validateCsvStructure(csvPath: string): Promise<ValidationResult> {
    try {
      this.logger.log(`Validating CSV structure: ${csvPath}`);

      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        return {
          isValid: false,
          errors: ['CSV file is empty'],
          warnings: [],
          emptyRows: 0,
          duplicateRows: 0,
        };
      }

      const warnings: string[] = [];
      let emptyRows = 0;

      // Validação básica apenas
      const headerLine = lines[0];
      const headers = this.parseCsvLine(headerLine);
      
      if (headers.length === 0) {
        return {
          isValid: false,
          errors: ['No headers found'],
          warnings: [],
          emptyRows: 0,
          duplicateRows: 0,
        };
      }

      // Contar linhas vazias
      const dataLines = lines.slice(1);
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (line === '') {
          emptyRows++;
        }
      }

      if (emptyRows > 0) {
        warnings.push(`Found ${emptyRows} empty rows`);
      }

      this.logger.log(`CSV validation completed: VALID (${warnings.length} warnings)`);

      return {
        isValid: true,
        errors: [],
        warnings,
        emptyRows,
        duplicateRows: 0,
      };

    } catch (error) {
      this.logger.error(`CSV validation failed: ${error.message}`, error.stack);
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
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Aspas duplas escapadas
          current += '"';
          i += 2;
        } else {
          // Alternar estado das aspas
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Fim da célula
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Adicionar a última célula
    result.push(current);

    return result;
  }

  async readCsvAsObjects(csvPath: string): Promise<CsvRow[]> {
    try {
      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        return [];
      }

      const headers = this.parseCsvLine(lines[0]);
      const dataLines = lines.slice(1);
      
      return dataLines.map(line => {
        const cells = this.parseCsvLine(line);
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header.trim()] = cells[index] || '';
        });
        
        return row as CsvRow;
      });

    } catch (error) {
      this.logger.error(`Failed to read CSV as objects: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteCsvFile(csvPath: string): Promise<void> {
    try {
      await fs.unlink(csvPath);
      this.logger.log(`Deleted CSV file: ${csvPath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete CSV file ${csvPath}: ${error.message}`);
    }
  }
}