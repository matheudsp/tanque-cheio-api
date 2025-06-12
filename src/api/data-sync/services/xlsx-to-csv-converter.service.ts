import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { CsvRow } from '../interfaces/csv-row.interface';
import type {
  ConversionResult,
  ValidationResult,
} from '../interfaces/xlsx-to-csv.interface';
import { generateCsvFileName } from '../utils/generate-csv-filename';

@Injectable()
export class XlsxToCsvConverterService {
  private readonly logger = new Logger(XlsxToCsvConverterService.name);
  private readonly datasetDir = path.join(process.cwd(), 'dataset');

  constructor() {
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    fs.mkdir(this.datasetDir, { recursive: true }).catch((err) => {
      this.logger.error(
        `Não foi possível criar a pasta dataset: ${err.message}`,
        err.stack,
      );
    });
  }

  async convertToCsv(xlsxPath: string): Promise<ConversionResult> {
    try {
      this.logger.log(`🔎Convertendo XLSX para CSV: ${xlsxPath}`);

      // Verificar se o arquivo existe
      await fs.access(xlsxPath);

      // Ler o arquivo XLSX preservando formato original
      const workbook = XLSX.readFile(xlsxPath, {
        type: 'file',
        cellText: false, // Desabilitar para ter controle manual
        cellDates: false, // Não converter datas automaticamente
        cellNF: false, // Desabilitar formatação automática
        cellStyles: true, // Preservar estilos para acessar formatação
        sheetStubs: true, // Incluir células vazias
        raw: false, // Não usar apenas valores brutos
        dateNF: 'yyyy-mm-dd', // Formato padrão para datas se necessário
      });

      // Obter a primeira planilha
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('❌Nenhuma planilha no arquivo');
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
        throw new Error(
          '❌Linha do cabeçalho com CNPJ não encontrado no arquivo',
        );
      }

      // Extrair cabeçalhos
      const headers: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: headerRowIndex,
          c: col,
        });
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

      const filteredHeaders = validColumns.map((col) => headers[col]);

      // Extrair dados das linhas com tratamento especial para CNPJ
      const dataRows: string[][] = [];
      const cnpjColIndex = filteredHeaders.findIndex(
        (h) => h.toUpperCase().trim() === 'CNPJ',
      );

      for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
        const rowData: string[] = [];
        let hasData = false;

        for (let i = 0; i < validColumns.length; i++) {
          const colIndex = validColumns[i];
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
          const cell = worksheet[cellAddress];

          let cellValue = '';
          if (cell) {
            if (
              cell.w !== undefined &&
              cell.w !== null &&
              String(cell.w).trim() !== ''
            ) {
              cellValue = String(cell.w).trim();
            } else if (cell.v !== undefined && cell.v !== null) {
              cellValue = String(cell.v).trim();
            }
          }

          const headerName = filteredHeaders[i].toUpperCase().trim();

          // Tratamento para CNPJ
          if (i === cnpjColIndex && cellValue !== '') {
            const numericCnpj = cellValue.replace(/\D/g, '').padStart(14, '0');

            if (/^\d{14}$/.test(numericCnpj)) {
              cellValue = `${numericCnpj.slice(0, 2)}.${numericCnpj.slice(2, 5)}.${numericCnpj.slice(5, 8)}/${numericCnpj.slice(8, 12)}-${numericCnpj.slice(12)}`;
            }
          }

          // Tratamento para DATA DA COLETA
          else if (headerName === 'DATA DA COLETA' && cell?.t === 'n') {
            const excelDate = Number(cell.v);

            // Convertendo número serial para data no formato dd/MM/yyyy
            if (!isNaN(excelDate)) {
              const date = XLSX.SSF.parse_date_code(excelDate);
              if (date) {
                const dd = String(date.d).padStart(2, '0');
                const mm = String(date.m).padStart(2, '0');
                const yyyy = date.y;
                cellValue = `${dd}/${mm}/${yyyy}`;
              }
            }
          }
           // Tratamento para CEP para garantir a formatação correta
          else if (headerName === 'CEP' && cellValue !== '') {
            // Remove qualquer caractere que não seja um dígito
            const numericCep = cellValue.replace(/\D/g, '');

            // Garante que o CEP tenha 8 dígitos, preenchendo com zeros à esquerda
            const paddedCep = numericCep.padStart(8, '0');

            // Aplica a formatação XXXXX-XXX se a string tiver 8 dígitos
            if (paddedCep.length === 8) {
              cellValue = `${paddedCep.slice(0, 5)}-${paddedCep.slice(5)}`;
            }
          }

          if (cellValue !== '') {
            hasData = true;
          }

          rowData.push(cellValue);
        }

        if (hasData) {
          dataRows.push(rowData);
        }
      }

      // Gerar nome
      const csvFileName = generateCsvFileName('anp');
      const csvPath = path.join(this.datasetDir, csvFileName);

      // Construir dados para CSV
      const csvData = [filteredHeaders, ...dataRows];
      const csvContent = this.convertJsonToCsv(csvData);

      // Salvar arquivo CSV
      await fs.writeFile(csvPath, csvContent, 'utf8');

      const rowCount = dataRows.length;
      const columnCount = filteredHeaders.length;

      this.logger.log(
        `✅XLSX convertido com sucesso: ${csvFileName} (${rowCount} linhas, ${columnCount} colunas)`,
      );

      return {
        success: true,
        csvPath,
        csvFileName,
        rowCount,
        columnCount,
        headers: filteredHeaders,
      };
    } catch (error) {
      this.logger.error(
        `❌Conversão XLSX falhou: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: `❌Conversão falhou: ${error.message}`,
      };
    }
  }

  private convertJsonToCsv(data: string[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const cellValue = String(cell || '');

            // Escapar aspas duplas e envolver em aspas se necessário
            if (
              cellValue.includes(',') ||
              cellValue.includes('\n') ||
              cellValue.includes('"') ||
              cellValue.includes(';')
            ) {
              return `"${cellValue.replace(/"/g, '""')}"`;
            }

            return cellValue;
          })
          .join(','),
      )
      .join('\n');
  }

  async validateCsvStructure(csvPath: string): Promise<ValidationResult> {
    try {
      this.logger.log(`🔎Validando estrutura CSV: ${csvPath}`);

      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

      if (lines.length === 0) {
        return {
          isValid: false,
          errors: ['Arquivo CSV está vazio'],
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
          errors: ['Nenhum cabeçalho encontrado'],
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
        warnings.push(`Encontrado ${emptyRows} linhas vazias`);
      }

      this.logger.log(
        `✅Validação do CSV concluida: (${warnings.length} avisos)`,
      );

      return {
        isValid: true,
        errors: [],
        warnings,
        emptyRows,
        duplicateRows: 0,
      };
    } catch (error) {
      this.logger.error(
        `❌Validação do CSV falhou: ${error.message}`,
        error.stack,
      );
      return {
        isValid: false,
        errors: [`Validação falhou: ${error.message}`],
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
      const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

      if (lines.length < 2) {
        return [];
      }

      const headers = this.parseCsvLine(lines[0]);
      const dataLines = lines.slice(1);

      return dataLines.map((line) => {
        const cells = this.parseCsvLine(line);
        const row: any = {};

        headers.forEach((header, index) => {
          row[header.trim()] = cells[index] || '';
        });

        return row as CsvRow;
      });
    } catch (error) {
      this.logger.error(
        `❌Falha ao ler o CSV como objeto: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteCsvFile(csvPath: string): Promise<void> {
    try {
      await fs.unlink(csvPath);
      this.logger.log(`🎆Arquivo CSV deletado: ${csvPath}`);
    } catch (error) {
      this.logger.warn(`❌Falha ao deletar CSV ${csvPath}: ${error.message}`);
    }
  }
}
