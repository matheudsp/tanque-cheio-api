import { Body, Controller, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DataSyncService } from './data-sync.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from './dtos/download-spreadsheet.dto';
import { responseOk, responseBadRequest } from '@/common/utils/response-api';
import { CsvProcessor } from './processors/csv-file.processor';
import { RoleGuard } from '@/common/guards/role/role.guard';
@ApiTags('Data Sync')
@ApiBearerAuth()
@Controller({ path: 'data-sync', version: '1' })
@UseGuards(RoleGuard)
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly csvProcessor: CsvProcessor,
    private readonly fileTransformer: DataSyncService,
  ) {}

  @Post('download-spreadsheet')
  @ApiOperation({
    summary: 'Baixar e processar planilha da ANP',
    description:
      'Faz o download de uma planilha da ANP em formato XLSX, converte para CSV e aplica lógica de upsert inteligente nos registros.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Planilha baixada e processada com sucesso',
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
    try {
      // 1) Baixar e converter a planilha (XLSX → CSV + validação estrutural)
      const downloadResult = await this.fileTransformer.downloadAndConvert(
        body.url,
      );
      if (!downloadResult.success) {
        // this.logger.warn(
        //   'Falha no download ou conversão da planilha',
        //   downloadResult.errors,
        // );
        return responseBadRequest({
          error: 'Erro no download/conversão da planilha',
          message: `${downloadResult.errors}`,
        });
      }

      const processedFile = downloadResult.processedFile!;

      // 2) Processar o CSV para inserir/atualizar no banco
      const processingResult = await this.csvProcessor.processFile(
        processedFile.csvPath,
      );

      // 3) Montar mensagem final de processamento
      const processingMessage = this.buildProcessingMessage(processingResult);
      const validationSummary = this.buildValidationSummary(
        processedFile.validationResult,
      );

      let finalMessage = `Planilha baixada e processada com sucesso. ${processingMessage}`;
      if (processedFile.validationResult.warnings.length > 0) {
        finalMessage += ` (${processedFile.validationResult.warnings.length} aviso(s) encontrados)`;
      }

      // 4) Retornar resposta 200 com dados
      return responseOk({
        message: finalMessage,
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
      // this.logger.error('Erro no processamento da planilha:', error);
      return responseBadRequest({ 
        error: 'Erro no processamento da planilha',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Constrói a mensagem descritiva com base no resultado do processamento.
   */
  private buildProcessingMessage(result: {
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
    totalProcessed: number;
  }): string {
    const parts: string[] = [];

    if (result.totalInserted > 0) {
      parts.push(`${result.totalInserted} novo(s) registro(s) inserido(s)`);
    }
    if (result.totalUpdated > 0) {
      parts.push(`${result.totalUpdated} registro(s) atualizado(s)`);
    }
    if (result.totalSkipped > 0) {
      parts.push(
        `${result.totalSkipped} registro(s) ignorado(s) (dados mais antigos)`,
      );
    }
    if (result.totalErrors > 0) {
      parts.push(`${result.totalErrors} erro(s) encontrado(s)`);
    }

    return parts.length > 0
      ? parts.join(', ')
      : 'Nenhum registro foi processado';
  }

  /**
   * Resume o resultado da validação da planilha baixada.
   */
  private buildValidationSummary(validationResult: {
    isValid: boolean;
    errors: any[];
    warnings: any[];
    emptyRows: number;
    duplicateRows: number;
  }) {
    return {
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      emptyRows: validationResult.emptyRows,
      duplicateRows: validationResult.duplicateRows,
    };
  }
}
