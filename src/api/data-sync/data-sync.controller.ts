import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CsvFileProcessor } from './processors/csv-file.processor';
import { FileTransformerCsv } from './services/file-transformer-csv.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from '../gas-station/dtos/gas-station.dto';
import { responseOk, responseBadRequest } from '@/common/utils/response-api';

@ApiTags('Sincronizar Dados')
@Controller({ path: 'data-sync', version: '1' })
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly csvProcessor: CsvFileProcessor,
    private readonly fileTransformer: FileTransformerCsv,
  ) {}

  @Post('process-csv')
  @ApiOperation({
    summary: 'Process ANP CSV file',
    description:
      'Processes local CSV file with ANP fuel price data. Only inserts/updates records if the collection date is newer or equal to existing records.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV processed successfully with detailed statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            totalProcessed: {
              type: 'number',
              description: 'Total records processed (inserted + updated)',
            },
            totalInserted: {
              type: 'number',
              description: 'New records inserted',
            },
            totalUpdated: {
              type: 'number',
              description: 'Existing records updated',
            },
            totalSkipped: {
              type: 'number',
              description: 'Records skipped (older data)',
            },
            totalErrors: { type: 'number', description: 'Records with errors' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'number' },
                  data: { type: 'object' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async processCsv() {
    try {
      const fileToProcess = 'anp-mes5-semana3.csv'; 

      this.logger.log(`Processing file: ${fileToProcess}`);

      const result = await this.csvProcessor.processFile(fileToProcess);

      const message = this.buildProcessingMessage(result);

      return responseOk({ 
        message,
        data: result,
      });
    } catch (error) {
      this.logger.error('CSV processing failed:', error);
      return responseBadRequest({ error: error.message });
    }
  }

  private buildProcessingMessage(result: {
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
  }): string {
    // 1) deixe claro que é um array de strings
    const parts: string[] = []; // ou:  const parts = [] as string[];

    if (result.totalInserted > 0) {
      parts.push(`${result.totalInserted} novos registros inseridos`);
    }

    if (result.totalUpdated > 0) {
      parts.push(`${result.totalUpdated} registros atualizados`);
    }

    if (result.totalSkipped > 0) {
      parts.push(
        `${result.totalSkipped} registros ignorados (dados mais antigos)`,
      );
    }

    if (result.totalErrors > 0) {
      parts.push(`${result.totalErrors} erros encontrados`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Nenhum registro processado';
  }

  // @Post('download-spreadsheet')
  // @ApiOperation({
  //   summary: 'Download and process ANP spreadsheet',
  //   description: 'Downloads and processes official ANP XLSX file with smart upsert logic'
  // })
  // async downloadSpreadsheet(@Body() body: DownloadSpreadsheetDto) {
  //   try {
  //     // Implementation would use fileTransformer service
  //     const result = await this.fileTransformer.processFile(
  //       body.url,
  //       'anp-spreadsheet.xlsx',
  //       { validateContent: true, customValidation: true }
  //     );

  //     if (!result.success) {
  //       return responseBadRequest({ error: result.errors });
  //     }

  //     // Process the converted CSV with smart upsert
  //     const processResult = await this.csvProcessor.processFile(
  //       result.processedFile.csvPath
  //     );

  //     // Cleanup temporary files
  //     await this.fileTransformer.cleanup(result.processedFile.tempFiles);

  //     const message = this.buildProcessingMessage(processResult);

  //     return responseOk({
  //       message: `Planilha baixada e processada com sucesso. ${message}`,
  //       data: processResult
  //     });
  //   } catch (error) {
  //     this.logger.error('Spreadsheet processing failed:', error);
  //     return responseBadRequest({ error: error.message });
  //   }
  // }
}
