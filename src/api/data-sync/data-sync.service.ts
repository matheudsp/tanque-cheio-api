import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

import { FileDownloaderService } from './services/file-downloader.service';
import { XlsxToCsvConverterService } from './services/xlsx-to-csv-converter.service';
import type { FileTransformationResult, ProcessedFileInfo } from './interfaces/xlsx-to-csv.interface';

/**
 * DataSyncService: responsabilidade única de baixar a planilha XLSX,
 * converter para CSV e validar estrutura inicial do CSV.
 */
@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);

  constructor(
    private readonly fileDownloader: FileDownloaderService,
    private readonly xlsxToCsvConverter: XlsxToCsvConverterService,
  ) {}

  /**
   * Orquestra todo o fluxo de:
   * 1) download do XLSX (via FileDownloaderService),
   * 2) conversão para CSV (via XlsxToCsvConverterService),
   * 3) validação estrutural do CSV (via XlsxToCsvConverterService.validateCsvStructure),
   * 4) inserção de todos os dados (tamanho, contagem de linhas/colunas, headers).
   *
   * Retorna FileTransformationResult contendo:
   * - success: se download/conversão/validação deram certo,
   * - processedFile: objeto com informações do CSV final (caminho, contagem, headers, validação),
   * - tempFiles: lista de arquivos temporários gerados,
   * - errors: lista de mensagens de erro, caso haja alguma falha em qualquer etapa.
   */
  async downloadAndConvert(url: string): Promise<FileTransformationResult> {
    const tempFiles: string[] = [];
    const errors: string[] = [];

    try {
      // === ETAPA 1: DOWNLOAD DO XLSX ===
      // this.logger.debug(`Iniciando download da planilha: ${url}`);
      const downloadResult = await this.fileDownloader.downloadFile(url);

      if (!downloadResult.success || !downloadResult.filePath) {
        const errMsg = downloadResult.error || '❌ Falha desconhecida no download';
        this.logger.error(errMsg);
        errors.push(errMsg);
        return { success: false, errors, tempFiles };
      }
      tempFiles.push(downloadResult.filePath);

      // === ETAPA 2: CONVERSÃO XLSX → CSV ===
      // this.logger.debug(`Convertendo arquivo XLSX para CSV: ${downloadResult.filePath}`);
      const conversionResult = await this.xlsxToCsvConverter.convertToCsv(downloadResult.filePath);

      if (!conversionResult.success || !conversionResult.csvPath) {
        const errMsg = conversionResult.error || '❌ Falha na conversão para CSV';
        this.logger.error(errMsg);
        errors.push(errMsg);
        return { success: false, errors, tempFiles };
      }
      tempFiles.push(conversionResult.csvPath);

      // === ETAPA 3: VALIDAÇÃO ESTRUTURAL DO CSV ===
      // this.logger.debug(`Validando estrutura do CSV: ${conversionResult.csvPath}`);
      const validationResult = await this.xlsxToCsvConverter.validateCsvStructure(conversionResult.csvPath);

      // === ETAPA 4: COLETAR METADADOS DO CSV ===
      const csvStats = await fs.stat(conversionResult.csvPath);
      const processedFile: ProcessedFileInfo = {
        csvPath: conversionResult.csvPath,
        originalName: downloadResult.fileName || 'downloaded_file',
        rowCount: conversionResult.rowCount ?? 0,
        columnCount: conversionResult.columnCount ?? 0,
        fileSize: csvStats.size,
        headers: conversionResult.headers ?? [],
        validationResult,
      };

      return {
        success: true,
        processedFile,
        tempFiles,
        errors: [],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Erro inesperado ao transformar planilha:', msg);
      errors.push(`❌ Transformação falhou: ${msg}`);
      return {
        success: false,
        errors,
        tempFiles,
      };
    }
  }
}
