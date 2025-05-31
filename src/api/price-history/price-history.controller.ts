import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { PriceHistoryService } from './price-history.service';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { 
  PriceHistoryQueryDto, 
  GasStationPriceHistory,
  PriceChartQueryDto 
} from './dtos/price-history.dto';
import { Response } from 'express';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';

@ApiTags('Price History')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'price-history' })
export class PriceHistoryController {
  constructor(private readonly service: PriceHistoryService) {}

  @Get('station/:stationId/dashboard')
  @ApiOperation({ 
    summary: 'Get Station Dashboard Data',
    description: 'Retorna os últimos preços de todos os produtos e dados para dashboard'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getStationDashboard(
    @Param('stationId') stationId: string,
    @Res() res: Response
  ) {
    const r = await this.service.getStationDashboard(stationId);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ 
    summary: 'Get Latest Prices by Gas Station',
    description: 'Retorna os preços mais recentes de cada combustível do posto'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getLatestPrices(
    @Param('stationId') stationId: string,
    @Res() res: Response
  ) {
    const r = await this.service.getLatestPrices(stationId);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/chart/:productName')
  @ApiOperation({ 
    summary: 'Get Price Chart Data',
    description: 'Retorna dados formatados para gráfico de variação de preços'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getPriceChart(
    @Param('stationId') stationId: string,
    @Param('productName') productName: string,
    @Query() query: PriceChartQueryDto,
    @Res() res: Response
  ) {
    const r = await this.service.getPriceChart(stationId, productName, query);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/summary')
  @ApiOperation({ 
    summary: 'Get Price Summary',
    description: 'Retorna resumo estatístico dos preços do posto'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getPriceSummary(
    @Param('stationId') stationId: string,
    @Query() query: { periodo?: 'semana' | 'mes' | 'trimestre' },
    @Res() res: Response
  ) {
    const r = await this.service.getPriceSummary(stationId, query.periodo);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/product/:productName')
  @ApiOperation({ 
    summary: 'Get Price History by Station and Product',
    description: 'Histórico detalhado de preços por produto'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getByStationAndProduct(
    @Param('stationId') stationId: string,
    @Param('productName') productName: string,
    @Query() query: GasStationPriceHistory,
    @Res() res: Response
  ) {
    const r = await this.service.getByStationAndProduct(stationId, productName, query);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/trends')
  @ApiOperation({ 
    summary: 'Get Price Trends',
    description: 'Análise de tendências de preços'
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getPriceTrends(
    @Param('stationId') stationId: string,
    @Query() query: { periodo?: 'mes' | 'trimestre' },
    @Res() res: Response
  ) {
    const r = await this.service.getPriceTrends(stationId, query.periodo);
    res.status(r.statusCode).send(r);
  }
}