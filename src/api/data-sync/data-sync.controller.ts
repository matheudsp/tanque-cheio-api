import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FileTransformerService } from './services/file-transformer.service';

import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from './dtos/download-spreadsheet.dto';
import { responseOk, responseBadRequest } from '@/common/utils/response-api';
import { CsvProcessor } from './processors/csv-file.processor';

@ApiTags('Sincronizar Dados')
@Controller({ path: 'data-sync', version: '1' })
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly csvProcessor: CsvProcessor,
    private readonly fileTransformer: FileTransformerService,
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
      const fileToProcess = 'anp_mes5_semana4_sample.csv';

      this.logger.log(`Processando arquivo: ${fileToProcess}`);

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

  @Post('download-spreadsheet')
  @ApiOperation({
    summary: 'Download and process ANP spreadsheet',
    description:
      'Downloads and processes official ANP XLSX file with smart upsert logic',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spreadsheet downloaded and processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            downloadInfo: {
              type: 'object',
              properties: {
                originalUrl: { type: 'string' },
                fileName: { type: 'string' },
                csvPath: { type: 'string' },
                rowCount: { type: 'number' },
                columnCount: { type: 'number' },
                fileSize: { type: 'number' },
                headers: {
                  type: 'array',
                  items: { type: 'string' },
                },
                validationSummary: {
                  type: 'object',
                  properties: {
                    isValid: { type: 'boolean' },
                    errorCount: { type: 'number' },
                    warningCount: { type: 'number' },
                    emptyRows: { type: 'number' },
                    duplicateRows: { type: 'number' },
                  },
                },
              },
            },
            processingResult: {
              type: 'object',
              properties: {
                totalProcessed: { type: 'number' },
                totalInserted: { type: 'number' },
                totalUpdated: { type: 'number' },
                totalSkipped: { type: 'number' },
                totalErrors: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async downloadSpreadsheet(@Body() body: DownloadSpreadsheetDto) {
    let tempFiles: string[] = [];
    
    try {
      this.logger.log(`Starting spreadsheet download from: ${body.url}`);

      // Step 1: Download and convert XLSX to CSV
      const downloadResult = await this.fileTransformer.downloadAndConvert(
        body.url,
      );

      if (!downloadResult.success) {
        this.logger.error(
          'Failed to download and convert spreadsheet',
          downloadResult.errors,
        );
        return responseBadRequest({
          error: 'Falha no download da planilha',
          message: downloadResult.errors?.join(', ') || 'Erro desconhecido',
        });
      }

      const processedFile = downloadResult.processedFile!;
      tempFiles = downloadResult.tempFiles || [];

      this.logger.log(
        `Spreadsheet converted successfully: ${processedFile.rowCount} rows, ${processedFile.columnCount} columns`,
      );

      // Step 2: Process the converted CSV
      const processingResult = await this.csvProcessor.processFile(
        processedFile.csvPath,
      );

      this.logger.log(
        `CSV processing completed: ${processingResult.totalProcessed} records processed`,
      );

      // Step 3: Build response message
      const processingMessage = this.buildProcessingMessage(processingResult);
      const validationSummary = this.buildValidationSummary(processedFile.validationResult);
      
      let successMessage = `Planilha baixada e processada com sucesso. ${processingMessage}`;
      
      if (processedFile.validationResult.warnings.length > 0) {
        successMessage += ` (${processedFile.validationResult.warnings.length} avisos encontrados)`;
      }

      return responseOk({
        message: successMessage,
        data: {
          downloadInfo: {
            originalUrl: body.url,
            fileName: processedFile.originalName,
            csvPath: processedFile.csvPath,
            rowCount: processedFile.rowCount,
            columnCount: processedFile.columnCount,
            fileSize: processedFile.fileSize,
            headers: processedFile.headers,
            validationSummary,
          },
          processingResult,
        },
      });

    } catch (error) {
      this.logger.error('Spreadsheet processing failed:', error);
      return responseBadRequest({
        error: 'Erro no processamento da planilha',
        message: error.message,
      });
    } finally {
      // Cleanup temporary files asynchronously
      if (tempFiles.length > 0) {
        this.cleanupTempFilesAsync(tempFiles);
      }
    }
  }

  private buildProcessingMessage(result: {
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
  }): string {
    const parts: string[] = [];

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

  private buildValidationSummary(validationResult: any) {
    return {
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      emptyRows: validationResult.emptyRows,
      duplicateRows: validationResult.duplicateRows,
    };
  }

  private cleanupTempFilesAsync(tempFiles: string[]): void {
    // Cleanup files asynchronously without blocking the response
    setTimeout(async () => {
      try {
        await this.fileTransformer.cleanupFiles(tempFiles);
        this.logger.log(`Cleaned up ${tempFiles.length} temporary files`);
      } catch (error) {
        this.logger.warn(`Failed to cleanup temporary files: ${error.message}`);
      }
    }, 5000); // Wait 5 seconds before cleanup to ensure response is sent
  }
}