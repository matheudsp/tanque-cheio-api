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
import { Response } from 'express';

import { GasStationService } from './gas-station.service';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import {
  GasStationQueryDto,
  NearbyStationsQueryDto,
} from './dtos/gas-station.dto';

@ApiTags('Gas Stations')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'gas-stations' })
export class GasStationController {
  constructor(private readonly service: GasStationService) {}

  @Get()
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
    description:
      'Get Station by ID',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async find( @Param('stationId') stationId: string, @Res() res: Response) {
    const result = await this.service.findById(stationId);
    res.status(result.statusCode).send(result);
  }
  
}
