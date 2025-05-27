import * as XLSX from 'xlsx';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { createReadStream } from 'fs';
import { Logger } from '@nestjs/common';
import type { FileProcessorConfig, FileValidationResult, ProcessedFileResult } from '@/api/data-sync/interfaces/base.interface';


export class XlsxToCsv {
  private readonly logger = new Logger(XlsxToCsv.name);
  private readonly config: Required<FileProcessorConfig>;

  constructor(config: FileProcessorConfig = {}) {
    this.config = {
      tempDir: config.tempDir || '/tmp',
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB default
      allowedExtensions: config.allowedExtensions || ['.xlsx', '.xls'],
    };
  }

  /**
   * Processa arquivo XLSX/XLS e converte para CSV
   */
  async processXlsxToCsv(
    filePath: string,
    originalName: string
  ): Promise<ProcessedFileResult> {
    try {
      this.logger.log(`Iniciando processamento do arquivo: ${originalName}`);

      // Validar extensão do arquivo
      this.validateFileExtension(originalName);

      // Ler arquivo XLSX
      const workbook = XLSX.readFile(filePath, {
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Arquivo não possui planilhas válidas');
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error('Planilha está vazia ou corrompida');
      }

      // Converter para JSON para obter headers e dados
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (jsonData.length === 0) {
        throw new Error('Planilha não contém dados');
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Gerar nome único para arquivo CSV
      const timestamp = Date.now();
      const csvFileName = `${timestamp}_${originalName.replace(/\.(xlsx|xls)$/i, '.csv')}`;
      const csvPath = join(this.config.tempDir, csvFileName);

      // Converter para CSV
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      await writeFile(csvPath, csv, 'utf8');

      this.logger.log(`Arquivo convertido para CSV: ${csvPath}`);

      return {
        csvPath,
        originalName,
        rowCount: dataRows.length,
        columnCount: headers.length,
        headers: headers.filter(Boolean),
        tempFiles: [csvPath],
      };
    } catch (error) {
      this.logger.error(`Erro ao processar arquivo XLSX: ${error.message}`);
      throw new Error(`Falha no processamento do arquivo: ${error.message}`);
    }
  }

  /**
   * Valida o conteúdo do arquivo CSV
   */
  async validateCsvContent(
    csvPath: string,
    requiredHeaders?: string[],
    customValidators?: Array<(row: any[], headers: string[], rowIndex: number) => string[]>
  ): Promise<FileValidationResult> {
    try {
      this.logger.log(`Iniciando validação do arquivo: ${csvPath}`);

      const content = await this.readCsvFile(csvPath);
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return {
          isValid: false,
          errors: ['Arquivo CSV está vazio'],
          warnings: [],
          rowCount: 0,
          emptyRows: 0,
          duplicateRows: 0,
        };
      }

      const headers = this.parseCsvLine(lines[0]);
      const dataLines = lines.slice(1);
      
      const result: FileValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        rowCount: dataLines.length,
        emptyRows: 0,
        duplicateRows: 0,
      };

      // Validar headers obrigatórios
      if (requiredHeaders && requiredHeaders.length > 0) {
        const missingHeaders = requiredHeaders.filter(
          header => !headers.some(h => h.toLowerCase().trim() === header.toLowerCase().trim())
        );
        
        if (missingHeaders.length > 0) {
          result.errors.push(`Headers obrigatórios ausentes: ${missingHeaders.join(', ')}`);
        }
      }

      // Validar linhas de dados
      const processedRows = new Set<string>();
      
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const rowData = this.parseCsvLine(line);
        const rowIndex = i + 2; // +2 porque começamos do índice 1 e pulamos o header

        // Verificar linhas vazias
        if (rowData.every(cell => !cell.trim())) {
          result.emptyRows++;
          result.warnings.push(`Linha ${rowIndex} está vazia`);
          continue;
        }

        // Verificar duplicatas (baseado no conteúdo completo da linha)
        const rowKey = rowData.join('|').toLowerCase();
        if (processedRows.has(rowKey)) {
          result.duplicateRows++;
          result.warnings.push(`Linha ${rowIndex} é duplicata`);
        } else {
          processedRows.add(rowKey);
        }

        // Verificar número de colunas
        if (rowData.length !== headers.length) {
          result.errors.push(
            `Linha ${rowIndex}: Número de colunas (${rowData.length}) não corresponde ao número de headers (${headers.length})`
          );
        }

        // Executar validadores customizados
        if (customValidators) {
          for (const validator of customValidators) {
            const validationErrors = validator(rowData, headers, rowIndex);
            result.errors.push(...validationErrors);
          }
        }
      }

      // Determinar se é válido
      result.isValid = result.errors.length === 0;

      this.logger.log(`Validação concluída: ${result.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
      return result;
    } catch (error) {
      this.logger.error(`Erro na validação: ${error.message}`);
      return {
        isValid: false,
        errors: [`Erro na validação: ${error.message}`],
        warnings: [],
        rowCount: 0,
        emptyRows: 0,
        duplicateRows: 0,
      };
    }
  }

  /**
   * Limpa arquivos temporários
   */
  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await unlink(filePath);
        this.logger.log(`Arquivo temporário removido: ${filePath}`);
      } catch (error) {
        this.logger.warn(`Erro ao remover arquivo temporário ${filePath}: ${error.message}`);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Cria stream de leitura do arquivo CSV
   */
  createCsvReadStream(csvPath: string) {
    return createReadStream(csvPath, { encoding: 'utf8' });
  }

  private validateFileExtension(fileName: string): void {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new Error(
        `Extensão de arquivo não permitida: ${extension}. ` +
        `Extensões permitidas: ${this.config.allowedExtensions.join(', ')}`
      );
    }
  }

  private async readCsvFile(filePath: string): Promise<string> {
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Erro ao ler arquivo CSV: ${error.message}`);
    }
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

// Validadores específicos para dados da ANP
export class ANPValidators {
  /**
   * Valida linha de dados da ANP
   */
  static validateANPRow(row: string[], headers: string[], rowIndex: number): string[] {
    const errors: string[] = [];
    const headerMap = ANPValidators.createHeaderMap(headers);

    // Validar UF
    const ufIndex = headerMap.uf;
    if (ufIndex !== -1) {
      const uf = row[ufIndex]?.trim().toUpperCase();
      if (!uf || !/^[A-Z]{2}$/.test(uf)) {
        errors.push(`Linha ${rowIndex}: UF inválida: "${uf}"`);
      }
    }

    // Validar CNPJ
    const cnpjIndex = headerMap.cnpj;
    if (cnpjIndex !== -1) {
      const cnpj = row[cnpjIndex]?.replace(/\D/g, '');
      if (!cnpj || cnpj.length !== 14) {
        errors.push(`Linha ${rowIndex}: CNPJ inválido`);
      }
    }

    // Validar preços
    const precoVendaIndex = headerMap.preco_venda;
    if (precoVendaIndex !== -1) {
      const preco = row[precoVendaIndex]?.replace(',', '.');
      if (preco && (isNaN(Number(preco)) || Number(preco) < 0)) {
        errors.push(`Linha ${rowIndex}: Preço de venda inválido: "${preco}"`);
      }
    }

    // Validar CEP
    const cepIndex = headerMap.cep;
    if (cepIndex !== -1) {
      const cep = row[cepIndex]?.replace(/\D/g, '');
      if (cep && (cep.length !== 8 || !/^\d{8}$/.test(cep))) {
        errors.push(`Linha ${rowIndex}: CEP inválido: "${row[cepIndex]}"`);
      }
    }

    return errors;
  }

  private static createHeaderMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {
      uf: -1,
      cnpj: -1,
      preco_venda: -1,
      cep: -1,
    };

    const fieldMappings = {
      uf: ['uf', 'estado', 'sigla_uf'],
      cnpj: ['cnpj', 'cnpj_revenda'],
      preco_venda: ['preco_venda', 'preco_consumidor', 'valor_venda'],
      cep: ['cep', 'codigo_postal'],
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      Object.entries(fieldMappings).forEach(([field, variants]) => {
        if (variants.some(variant => normalizedHeader.includes(variant))) {
          if (map[field] === -1) {
            map[field] = index;
          }
        }
      });
    });

    return map;
  }
}