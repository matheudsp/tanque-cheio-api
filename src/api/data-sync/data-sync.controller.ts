import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileProcessorCsvService } from './services/file-processor-csv.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from '../gas-station/dtos/gas-station.dto';
import { DownloadSpreadsheetSchema } from '../gas-station/schemas/gas-station.schema';
import { zodErrorParse } from '@/common/utils/lib';
import { responseBadRequest } from '@/common/utils/response-api';

@ApiTags('Atualização de Dados')
@Controller({ path: 'data-sync', version: '1' })
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(private readonly processCsvService: FileProcessorCsvService) {}
  @Post('process-csv')
  @ApiOperation({
    summary: 'Processamento de arquivo CSV ANP',
    description:
      'Processa arquivo CSV local com dados de preços de combustíveis da ANP',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV processado com sucesso',
    schema: {
      example: {
        statusCode: 200,
        statusMessage: 'OK',
        message: '1500 registros processados com sucesso',
        data: {
          totalProcessed: 1500,
          totalErrors: 0,
          errors: [],
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async processCsv() {
    try {
      const result =
        await this.processCsvService.processCsvFile('/fuel-price.csv');

      this.logger.log(`Processamento do CSV concluído: ${result.statusCode}`);
      return result;
    } catch (error) {
      this.logger.error('Erro no processamento do CSV:', error);
      throw error;
    }
  }

  @Post('download-spreadsheet')
  @ApiOperation({
    summary: 'Download e processamento de planilha ANP',
    description:
      'Baixa e processa planilha XLSX oficial da ANP com dados de preços de combustíveis',
  })
  @ApiBody({
    type: DownloadSpreadsheetDto,
    description: 'URL da planilha XLSX da ANP',
    examples: {
      default: {
        summary: 'Exemplo',
        value: {
          url: 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2025/revendas_lpc_2025-05-18_2025-05-24.xlsx',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Planilha processada com sucesso',
    schema: {
      example: {
        statusCode: 200,
        statusMessage: 'OK',
        message: 'Planilha baixada e processada com sucesso',
        data: {
          totalProcessed: 1500,
          totalErrors: 0,
          errors: [],
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async downloadSpreadsheet(@Body() body: DownloadSpreadsheetDto) {
    try {
      const validation = DownloadSpreadsheetSchema.safeParse(body);
      if (!validation.success) {
        const zodErr = zodErrorParse(validation.error);
        return responseBadRequest({ error: zodErr.errors });
      }

      // Aqui você implementaria o download da planilha XLSX
      // e conversão para CSV antes de processar
      // Por enquanto, retorna um placeholder
      this.logger.log(`Download solicitado para: ${validation.data.url}`);

      return {
        statusCode: 200,
        statusMessage: 'OK',
        message: 'Funcionalidade de download em desenvolvimento',
        data: {
          url: validation.data.url,
          status: 'pending',
        },
      };
    } catch (error) {
      this.logger.error('Erro no download da planilha:', error);
      throw error;
    }
  }
}
