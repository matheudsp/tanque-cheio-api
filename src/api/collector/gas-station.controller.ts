import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CollectorService } from './gas-station.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { zodErrorParse } from '@/common/utils/lib';
import { responseBadRequest } from '@/common/utils/response-api';
import { ProcessCsvService } from './services/process-csv.service';
import { DownloadSpreadsheetDto, SearchGasStationsDto } from './dtos/gas-station.dto';
import { DownloadSpreadsheetSchema, SearchGasStationsSchema } from './schemas/gas-station.schema';




@ApiTags('Posto de Combustível')
@Controller({ path: 'postos-de-combustível', version: '1' })
export class CollectorController {
  private readonly logger = new Logger(CollectorController.name);

  constructor(
    private readonly collectorService: CollectorService,
    private readonly processCsvService: ProcessCsvService,
  ) {}

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

  @Get('search')
  @ApiOperation({
    summary: 'Busca postos de combustível',
    description:
      'Permite filtrar postos por estado, município, produto e bandeira',
  })
  @ApiQuery({
    name: 'uf',
    required: false,
    description: 'Sigla do estado (UF)',
    example: 'SP',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Nome do município',
    example: 'São Paulo',
  })
  @ApiQuery({
    name: 'produto',
    required: false,
    description: 'Tipo de combustível',
    example: 'Etanol',
  })
  @ApiQuery({
    name: 'bandeira',
    required: false,
    description: 'Bandeira do posto',
    example: 'Petrobras',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de resultados',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset para paginação',
    example: 0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de postos encontrados',
    schema: {
      example: {
        statusCode: 200,
        statusMessage: 'OK',
        data: {
          results: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              cnpj: '00.003.188/0001-21',
              uf: 'SP',
              municipio: 'SOROCABA',
              revenda: 'COMPETRO',
              produto: 'GASOLINA COMUM',
              preco_venda: 5.59,
              bandeira: 'BRANCA',
              data_coleta: '2025-05-19',
              endereco: 'RUA HUMBERTO DE CAMPOS, 306',
              bairro: 'JARDIM ZULMIRA',
              cep: '18061-000',
            },
          ],
          total: 100,
          limit: 50,
          offset: 0,
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async searchGasStations(@Query() query: SearchGasStationsDto) {
    try {
      const filters = {
        ...query,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      };

      const validation = SearchGasStationsSchema.safeParse(filters);
      if (!validation.success) {
        const zodErr = zodErrorParse(validation.error);
        return responseBadRequest({ error: zodErr.errors });
      }

      return await this.collectorService.searchGasStations(validation.data);
    } catch (error) {
      this.logger.error('Erro na busca de postos:', error);
      throw error;
    }
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Estatísticas dos dados de combustível',
    description:
      'Retorna estatísticas gerais dos postos e preços por estado e produto',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas dos dados',
    schema: {
      example: {
        statusCode: 200,
        statusMessage: 'OK',
        data: {
          totalStations: 15000,
          byState: [
            { uf: 'SP', total: 3000 },
            { uf: 'RJ', total: 2500 },
          ],
          byProduct: [
            {
              produto: 'GASOLINA COMUM',
              total: 8000,
              preco_medio: 5.45,
              preco_minimo: 4.89,
              preco_maximo: 6.12,
            },
            {
              produto: 'ETANOL',
              total: 6000,
              preco_medio: 3.21,
              preco_minimo: 2.89,
              preco_maximo: 3.78,
            },
          ],
          lastUpdate: '2025-05-24T00:00:00.000Z',
        },
      },
    },
  })
  @OpenApiResponses([HttpStatus.INTERNAL_SERVER_ERROR])
  async getStatistics() {
    try {
      return await this.collectorService.getFuelStatistics();
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}
