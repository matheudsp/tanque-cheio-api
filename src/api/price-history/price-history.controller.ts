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
import { PriceHistoryQueryDto, GasStationPriceHistory } from './dtos/price-history.dto';
import { Response } from 'express';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';

@ApiTags('Price History')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'price-history' })
export class PriceHistoryController {
  constructor(private readonly service: PriceHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get Price History by Product ID' })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async index(@Query() q: PriceHistoryQueryDto, @Res() res: Response) {
    const r = await this.service.index(q);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId')
  @ApiOperation({ summary: 'Get Price History by Gas Station ID' })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getByStation(
    @Param('stationId') stationId: string,
    @Query() q: GasStationPriceHistory,
    @Res() res: Response
  ) {
    const r = await this.service.getByStation(stationId, q);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ summary: 'Get Latest Prices by Gas Station ID' })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getLatestPrices(
    @Param('stationId') stationId: string,
    @Res() res: Response
  ) {
    const r = await this.service.getLatestPrices(stationId);
    res.status(r.statusCode).send(r);
  }

  @Get('station/:stationId/product/:productName')
  @ApiOperation({ summary: 'Get Price History by Station and Product' })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getByStationAndProduct(
    @Param('stationId') stationId: string,
    @Param('productName') productName: string,
    @Query() q: { periodo?: 'semana' | 'mes'; limite?: number },
    @Res() res: Response
  ) {
    const r = await this.service.getByStationAndProduct(stationId, productName, q);
    res.status(r.statusCode).send(r);
  }

}