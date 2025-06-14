import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Res,
  Body,
  Put,
} from '@nestjs/common';
import { LocalizationService } from './localization.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { Response } from 'express';
import type { LocalizationCreateDto } from './dtos/localization.dto';

class GeocodeBatchDto {
  ids: string[];
}
@ApiTags('Localizations')
@ApiBearerAuth()
@Controller({ version: ['1'], path: 'localizations' })
@UseGuards(RoleGuard)
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update Permission' })
  @OpenApiResponses([200, 400, 404, 409, 500])
  async update(
    @Param('id') id: string,
    @Body() body: LocalizationCreateDto,
    @Res() res: Response,
  ) {
    const r = await this.localizationService.update(id, body);
    res.status(r.statusCode).send(r);
  }

  @Post('geocode/all')
  @ApiOperation({
    summary: '??',
    description: '??',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async geocodeAllLocalizations(@Res() res: Response) {
    const r = await this.localizationService.geocodeAll();
    res.status(r.statusCode).send(r);
  }

  @Post('geocode/:id')
  @ApiOperation({
    summary: '??',
    description: '??',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async geocodeByLocalizationId(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const r = await this.localizationService.geocodeById(id);
    res.status(r.statusCode).send(r);
  }

  @Get('geocode/stats')
  @ApiOperation({
    summary: '??',
    description: '??',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getGeocodingStats(@Res() res: Response) {
    const r = await this.localizationService.getGeocodingStats();
    res.status(r.statusCode).send(r);
  }
}
