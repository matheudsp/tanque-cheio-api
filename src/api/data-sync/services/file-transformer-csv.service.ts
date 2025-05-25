
import { Injectable, Logger } from '@nestjs/common';
import {
  XlsxToCsv,
  ANPValidators,
} from '@/common/utils/xlsx-to-csv';
import type { FileProcessorOptions, FileProcessorResult, FileValidationResult } from '../interfaces/file-processor.interface';



@Injectable()
export class FileTransformerCsv {
  private readonly logger = new Logger(FileTransformerCsv.name);
  private readonly fileProcessor: XlsxToCsv;

  constructor() {
    this.fileProcessor = new XlsxToCsv({
      tempDir: process.env.TEMP_DIR || '/tmp',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedExtensions: ['.xlsx', '.xls'],
    });
  }

  /**
   * Processa arquivo XLSX para CSV com validação
   */
  async processFile(
    filePath: string,
    originalName: string,
    options: FileProcessorOptions = {},
  ): Promise<FileProcessorResult> {
    try {
      this.logger.log(`Iniciando processamento do arquivo: ${originalName}`);

      // Etapa 1: Conversão XLSX para CSV
      const processedFile = await this.fileProcessor.processXlsxToCsv(
        filePath,
        originalName,
      );

      this.logger.log(
        `Arquivo convertido com sucesso: ${processedFile.rowCount} linhas, ${processedFile.columnCount} colunas`,
      );

      // Etapa 2: Validação (se solicitada)
      let validation: FileValidationResult | undefined;

      if (options.validateContent) {
        const validators = options.customValidation
          ? [ANPValidators.validateANPRow]
          : undefined;

        validation = await this.fileProcessor.validateCsvContent(
          processedFile.csvPath,
          options.requiredHeaders,
          validators,
        );

        this.logger.log(
          `Validação concluída: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`,
        );

        if (!validation.isValid) {
          // Limpar arquivos temporários em caso de falha na validação
          await this.fileProcessor.cleanupTempFiles(processedFile.tempFiles);

          return {
            success: false,
            validation,
            message: 'Arquivo não passou na validação',
            errors: validation.errors,
          };
        }
      }

      return {
        success: true,
        processedFile,
        validation,
        message: 'Arquivo processado com sucesso',
        errors: [],
      };
    } catch (error) {
      this.logger.error(
        `Erro no processamento do arquivo: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: 'Erro no processamento do arquivo',
        errors: [error.message],
      };
    }
  }

  /**
   * Cria stream de leitura do arquivo CSV processado
   */
  async createReadStream(csvPath: string) {
    return this.fileProcessor.createCsvReadStream(csvPath);
  }

  /**
   * Limpa arquivos temporários
   */
  async cleanup(tempFiles: string[]): Promise<void> {
    await this.fileProcessor.cleanupTempFiles(tempFiles);
  }

  /**
   * Valida apenas o conteúdo de um arquivo CSV existente
   */
  async validateOnly(
    csvPath: string,
    options: FileProcessorOptions = {},
  ): Promise<FileValidationResult> {
    const validators = options.customValidation
      ? [ANPValidators.validateANPRow]
      : undefined;

    return await this.fileProcessor.validateCsvContent(
      csvPath,
      options.requiredHeaders,
      validators,
    );
  }
}
