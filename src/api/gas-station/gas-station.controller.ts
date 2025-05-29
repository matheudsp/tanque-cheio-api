import { Controller, Get, Query, Param, HttpStatus, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GasStationService } from './gas-station.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { zodErrorParse } from '@/common/utils/lib';
import { responseBadRequest } from '@/common/utils/response-api';
import { 
  SearchGasStationsDto, 
  GetNearbyStationsDto,
  GetStationsByProductDto,
  GetStationPriceHistoryDto 
} from './dtos/gas-station.dto';
import { 
  SearchGasStationsSchema, 
  GetNearbyStationsSchema,
  GetStationsByProductSchema,
  GetStationPriceHistorySchema 
} from './schemas/gas-station.schema';

@ApiTags('Posto de Combustível')
@Controller({ path: 'gas-station', version: '1' })
export class GasStationController {
  private readonly logger = new Logger(GasStationController.name);

  constructor(
    private readonly gasStationService: GasStationService,
  ) {}

  @Get('search')
  @ApiOperation({
    summary: 'Busca postos de combustível',
    description: 'Permite filtrar postos por UF, município, produto, bandeira com paginação',
  })
  @ApiQuery({
    name: 'uf',
    required: false,
    description: 'Estado (UF)',
    example: 'São Paulo',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Nome do município',
    example: 'Ribeirão preto',
  })
  @ApiQuery({
    name: 'produto',
    required: false,
    description: 'Tipo de combustível',
    example: 'GASOLINA COMUM',
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
    description: 'Limite de resultados (máximo 1000)',
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
              nome_razao: 'AUTO POSTO EXEMPLO LTDA',
              nome_fantasia: 'Posto Exemplo',
              bandeira: 'PETROBRAS',
              cnpj: '12.345.678/0001-90',
              ativo: true,
              localizacao: {
                id: 'loc-123',
                uf: 'SÃO PAULO',
                municipio: 'RIBEIRAO PRETO',
                endereco: 'RUA DAS FLORES, 123',
                bairro: 'CENTRO',
                cep: '01234-567'
              },
              historicoPrecos: [
                {
                  id: 'hist-123',
                  data_coleta: '2025-05-29',
                  preco_venda: 5.59,
                  produto: {
                    nome: 'GASOLINA COMUM',
                    categoria: 'COMBUSTÍVEL'
                  }
                }
              ]
            }
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

      return await this.gasStationService.searchGasStations(validation.data);
    } catch (error) {
      this.logger.error('Erro na busca de postos:', error);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca posto por ID',
    description: 'Retorna detalhes completos de um posto específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do posto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes do posto encontrado',
    schema: {
      example: {
        statusCode: 200,
        statusMessage: 'OK',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          nome_razao: 'AUTO POSTO EXEMPLO LTDA',
          nome_fantasia: 'Posto Exemplo',
          bandeira: 'PETROBRAS',
          cnpj: '12.345.678/0001-90',
          ativo: true,
          criadoEm: '2025-01-15T10:30:00.000Z',
          localizacao: {
            uf: 'SP',
            municipio: 'SÃO PAULO',
            endereco: 'RUA DAS FLORES, 123',
            bairro: 'CENTRO',
            cep: '01234-567',
            latitude: -23.5505,
            longitude: -46.6333
          },
          historicoPrecos: [
            {
              data_coleta: '2025-05-29',
              preco_venda: 5.59,
              produto: {
                nome: 'GASOLINA COMUM',
                categoria: 'COMBUSTÍVEL'
              }
            }
          ]
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Posto não encontrado',
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async getGasStationById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.gasStationService.getStationById(id);
    } catch (error) {
      this.logger.error(`Erro ao buscar posto ${id}:`, error);
      throw error;
    }
  }

  @Get('nearby/search')
  @ApiOperation({
    summary: 'Busca postos próximos',
    description: 'Encontra postos de combustível próximos a uma localização (lat/lng)',
  })
  @ApiQuery({
    name: 'latitude',
    required: true,
    description: 'Latitude da localização',
    example: -23.5505,
  })
  @ApiQuery({
    name: 'longitude',
    required: true,
    description: 'Longitude da localização',
    example: -46.6333,
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Raio de busca em quilômetros (padrão: 10km)',
    example: 5,
  })
  @ApiQuery({
    name: 'produto',
    required: false,
    description: 'Filtrar por tipo de combustível',
    example: 'GASOLINA COMUM',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de resultados',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de postos próximos ordenados por distância',
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async getNearbyStations(@Query() query: GetNearbyStationsDto) {
    try {
      const filters = {
        ...query,
        latitude: Number(query.latitude),
        longitude: Number(query.longitude),
        radius: query.radius ? Number(query.radius) : 10,
        limit: query.limit ? Number(query.limit) : 20,
      };

      const validation = GetNearbyStationsSchema.safeParse(filters);
      if (!validation.success) {
        const zodErr = zodErrorParse(validation.error);
        return responseBadRequest({ error: zodErr.errors });
      }

      return await this.gasStationService.getNearbyStations(validation.data);
    } catch (error) {
      this.logger.error('Erro na busca de postos próximos:', error);
      throw error;
    }
  }

  // @Get('product/:productName')
  // @ApiOperation({
  //   summary: 'Busca postos por produto',
  //   description: 'Lista postos que vendem um produto específico com preços atuais',
  // })
  // @ApiParam({
  //   name: 'productName',
  //   description: 'Nome do produto/combustível',
  //   example: 'GASOLINA COMUM',
  // })
  // @ApiQuery({
  //   name: 'uf',
  //   required: false,
  //   description: 'Filtrar por estado',
  //   example: 'SP',
  // })
  // @ApiQuery({
  //   name: 'municipio',
  //   required: false,
  //   description: 'Filtrar por município',
  //   example: 'São Paulo',
  // })
  // @ApiQuery({
  //   name: 'orderBy',
  //   required: false,
  //   description: 'Ordenar por: price_asc, price_desc, date_desc',
  //   example: 'price_asc',
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Limite de resultados',
  //   example: 50,
  // })
  // @ApiQuery({
  //   name: 'offset',
  //   required: false,
  //   description: 'Offset para paginação',
  //   example: 0,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Lista de postos com preços do produto',
  // })
  // @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  // async getStationsByProduct(
  //   @Param('productName') productName: string,
  //   @Query() query: GetStationsByProductDto
  // ) {
  //   try {
  //     const filters = {
  //       ...query,
  //       productName: decodeURIComponent(productName),
  //       limit: query.limit ? Number(query.limit) : 50,
  //       offset: query.offset ? Number(query.offset) : 0,
  //     };

  //     const validation = GetStationsByProductSchema.safeParse(filters);
  //     if (!validation.success) {
  //       const zodErr = zodErrorParse(validation.error);
  //       return responseBadRequest({ error: zodErr.errors });
  //     }

  //     return await this.gasStationService.getStationsByProduct(validation.data);
  //   } catch (error) {
  //     this.logger.error('Erro na busca por produto:', error);
  //     throw error;
  //   }
  // }

  // @Get(':id/price-history')
  // @ApiOperation({
  //   summary: 'Histórico de preços do posto',
  //   description: 'Retorna o histórico de preços de um posto específico',
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'ID do posto',
  //   example: '123e4567-e89b-12d3-a456-426614174000',
  // })
  // @ApiQuery({
  //   name: 'produto',
  //   required: false,
  //   description: 'Filtrar por produto específico',
  //   example: 'GASOLINA COMUM',
  // })
  // @ApiQuery({
  //   name: 'startDate',
  //   required: false,
  //   description: 'Data inicial (YYYY-MM-DD)',
  //   example: '2025-01-01',
  // })
  // @ApiQuery({
  //   name: 'endDate',
  //   required: false,
  //   description: 'Data final (YYYY-MM-DD)',
  //   example: '2025-05-29',
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Limite de resultados',
  //   example: 100,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Histórico de preços do posto',
  // })
  // @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR])
  // async getStationPriceHistory(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Query() query: GetStationPriceHistoryDto
  // ) {
  //   try {
  //     const filters = {
  //       ...query,
  //       stationId: id,
  //       limit: query.limit ? Number(query.limit) : 100,
  //       startDate: query.startDate ? new Date(query.startDate) : undefined,
  //       endDate: query.endDate ? new Date(query.endDate) : undefined,
  //     };

  //     const validation = GetStationPriceHistorySchema.safeParse(filters);
  //     if (!validation.success) {
  //       const zodErr = zodErrorParse(validation.error);
  //       return responseBadRequest({ error: zodErr.errors });
  //     }

  //     return await this.gasStationService.getStationPriceHistory(validation.data);
  //   } catch (error) {
  //     this.logger.error(`Erro ao buscar histórico do posto ${id}:`, error);
  //     throw error;
  //   }
  // }

  // @Get('statistics/general')
  // @ApiOperation({
  //   summary: 'Estatísticas gerais dos postos',
  //   description: 'Retorna estatísticas gerais dos postos e preços por estado e produto',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Estatísticas dos dados',
  //   schema: {
  //     example: {
  //       statusCode: 200,
  //       statusMessage: 'OK',
  //       data: {
  //         totalStations: 15000,
  //         totalActiveStations: 14500,
  //         byState: [
  //           { uf: 'SP', total: 3000 },
  //           { uf: 'RJ', total: 2500 },
  //         ],
  //         byProduct: [
  //           {
  //             produto: 'GASOLINA COMUM',
  //             total: 8000,
  //             preco_medio: 5.45,
  //             preco_minimo: 4.89,
  //             preco_maximo: 6.12,
  //           }
  //         ],
  //         byBrand: [
  //           { bandeira: 'PETROBRAS', total: 2000 },
  //           { bandeira: 'SHELL', total: 1500 },
  //         ],
  //         lastUpdate: '2025-05-29T00:00:00.000Z',
  //       },
  //     },
  //   },
  // })
  // @OpenApiResponses([HttpStatus.INTERNAL_SERVER_ERROR])
  // async getGeneralStatistics() {
  //   try {
  //     return await this.gasStationService.getGeneralStatistics();
  //   } catch (error) {
  //     this.logger.error('Erro ao obter estatísticas gerais:', error);
  //     throw error;
  //   }
  // }

  // @Get('statistics/prices')
  // @ApiOperation({
  //   summary: 'Estatísticas de preços por região',
  //   description: 'Retorna estatísticas de preços por estado e município',
  // })
  // @ApiQuery({
  //   name: 'uf',
  //   required: false,
  //   description: 'Filtrar por estado',
  //   example: 'SP',
  // })
  // @ApiQuery({
  //   name: 'produto',
  //   required: false,
  //   description: 'Filtrar por produto',
  //   example: 'GASOLINA COMUM',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Estatísticas de preços por região',
  // })
  // @OpenApiResponses([HttpStatus.INTERNAL_SERVER_ERROR])
  // async getPriceStatistics(@Query() query: { uf?: string; produto?: string }) {
  //   try {
  //     return await this.gasStationService.getPriceStatistics(query);
  //   } catch (error) {
  //     this.logger.error('Erro ao obter estatísticas de preços:', error);
  //     throw error;
  //   }
  // }

  // @Get('compare-prices/:productName')
  // @ApiOperation({
  //   summary: 'Comparar preços por região',
  //   description: 'Compara preços de um produto entre diferentes municípios/estados',
  // })
  // @ApiParam({
  //   name: 'productName',
  //   description: 'Nome do produto para comparação',
  //   example: 'GASOLINA COMUM',
  // })
  // @ApiQuery({
  //   name: 'uf',
  //   required: false,
  //   description: 'Filtrar por estado',
  //   example: 'SP',
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Limite de municípios retornados',
  //   example: 20,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Comparação de preços por região',
  // })
  // @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  // async comparePricesByRegion(
  //   @Param('productName') productName: string,
  //   @Query() query: { uf?: string; limit?: number }
  // ) {
  //   try {
  //     const filters = {
  //       productName: decodeURIComponent(productName),
  //       uf: query.uf,
  //       limit: query.limit ? Number(query.limit) : 20,
  //     };

  //     return await this.gasStationService.comparePricesByRegion(filters);
  //   } catch (error) {
  //     this.logger.error('Erro na comparação de preços:', error);
  //     throw error;
  //   }
  // }
}