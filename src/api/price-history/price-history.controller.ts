import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';

import { PriceHistoryService } from './price-history.service';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import { RoleGuard } from '@/common/guards/role/role.guard';

import {
  PeriodQueryDto,
  LatestPricesResponseDto,
  HistoryResponseDto,
} from './dtos/price-history.dto';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';

@ApiTags('Price History')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'price-history' })
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  /**
   * Rota para buscar os últimos preços de todos os produtos do posto
   */
  @Get('station/:stationId/latest')
  @ApiOperation({
    summary: 'Obter preços mais recentes',
    description: 'Retorna os preços mais recentes de todos os combustíveis do posto com variações calculadas',
  })
  @ApiParam({
    name: 'stationId',
    description: 'ID do posto de combustível',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Preços mais recentes retornados com sucesso',
    type: LatestPricesResponseDto,
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getLatestPrices(
    @Param('stationId') stationId: string,
    @Res() res: Response,
  ) {
    const result = await this.priceHistoryService.getLatestPrices(stationId);
    return res.status(result.statusCode).send(result);
  }

  /**
   * Rota para buscar histórico de preços por período
   */
  @Get('station/:stationId/history')
  @ApiOperation({
    summary: 'Obter histórico de preços por período',
    description: 'Retorna histórico de preços filtrado por período. Se produto não especificado, retorna todos os produtos.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'ID do posto de combustível',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data de início (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data de fim (YYYY-MM-DD)',
    required: true,
    type: 'string',
    example: '2025-01-31',
  })
  @ApiQuery({
    name: 'product',
    description: 'Nome do produto para filtrar (opcional). Se não informado, retorna todos os produtos.',
    required: false,
    type: 'string',
    example: 'GASOLINA',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de preços retornado com sucesso',
    type: HistoryResponseDto,
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getPriceHistory(
    @Param('stationId') stationId: string,
    @Query() query: PeriodQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.priceHistoryService.getPriceHistory(stationId, query);
    return res.status(result.statusCode).send(result);
  }
}