import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';

import { GasStationService } from './gas-station.service';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import {
  GasStationQueryDto,
  type PriceHistoryQueryDto,
} from './dtos/gas-station.dto';
import type { GetNearbyStationsSchema } from './schemas/gas-station.schema';

@ApiTags('Gas Stations')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'gas-stations' })
export class GasStationController {
  constructor(private readonly service: GasStationService) {}

  @Get('all')
  @ApiOperation({
    summary: 'All gas stations',
    description:
      'Get all gas stations with pagination support. Use filters to narrow down results.',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async all(@Res() res: Response) {
    const result = await this.service.all();
    res.status(result.statusCode).send(result);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search gas stations with filters',
    description:
      'Search for gas stations by municipality, product, brand, with pagination support',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async search(@Query() query: GasStationQueryDto, @Res() res: Response) {
    const result = await this.service.search(query);
    res.status(result.statusCode).send(result);
  }

  @Get(':stationId')
  @ApiOperation({
    summary: 'Get Station by ID',
    description: 'Get Station by ID',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async find(@Param('stationId') stationId: string, @Res() res: Response) {
    const result = await this.service.findById(stationId);
    res.status(result.statusCode).send(result);
  }
  
 @Get(':id/price-history')
  @ApiOperation({
    summary: 'Get price history for a gas station (for charts)',
    description: 'Returns price history for a specific gas station, grouped by product. Ideal for creating charts.',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getPriceHistory(
    @Param('id') id: string,
    @Query() query: PriceHistoryQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.service.getPriceHistoryForChart(id, query);
    return res.status(result.statusCode).send(result);
  }
  
  @Get('nearby')
  @ApiOperation({ summary: 'Busca postos de gasolina por proximidade' })
  async getNearbyStations(
    @Query() query: GetNearbyStationsSchema,
    @Res() res: Response,
  ) {
    
    const result = await this.service.findNearby(query);

    return res.status(result.statusCode).send(result)
  }
}
