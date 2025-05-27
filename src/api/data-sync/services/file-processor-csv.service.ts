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
      this.logger.log(`Starting CSV processing: ${filePath}`);
      const result = await this.csvProcessor.processFile(filePath);

      const message =
        `Processing completed: ${result.totalProcessed} processed, ` +
        `${result.totalInserted} inserted, ${result.totalUpdated} updated, ` +
        `${result.totalSkipped} skipped, ${result.totalErrors} errors`;

      return responseOk({ message, data: result });
    } catch (error) {
      this.logger.error('CSV processing failed:', error);
      return responseInternalServerError({
        message: 'Internal server error during CSV processing',
        error: error.message,
      });
    }
  }
}
