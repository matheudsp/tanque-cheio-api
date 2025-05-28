import { Injectable, Logger } from '@nestjs/common';

import {
  responseOk,
  responseInternalServerError,
  responseBadRequest,
} from '@/common/utils/response-api';

import { CsvProcessor } from '../processors/csv-file.processor';

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);

  constructor(private readonly csvProcessor: CsvProcessor) {}

  async processCsvFile(filePath: string) {
    try {
      this.logger.log(`🕛Iniciando processamento do CSV: ${filePath}`);
      const result = await this.csvProcessor.processFile(filePath);

      const message =
        `✅Processamento do CSV finalizado: ${result.totalProcessed} processados, ` +
        `${result.totalInserted} inseridos, ${result.totalUpdated} atualizados, ` +
        `${result.totalSkipped} ignorados, ${result.totalErrors} erros`;

      return responseOk({ message, data: result });
    } catch (error) {
      this.logger.error('Falha ao processar CSV:', error);
      return responseInternalServerError({
        message: 'Erro interno do servidor durante processamento do CSV',
        error: error.message,
      });
    }
  }
}
