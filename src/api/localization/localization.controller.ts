import {
  Controller, Get, Param, UseGuards, Res, Body, Put, Query,
} from '@nestjs/common';
import { LocalizationService } from './localization.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { Response } from 'express';
import { LocalizationCreateDto, LocalizationQueryDto } from './dtos/localization.dto';

@ApiTags('Localizations')
@ApiBearerAuth()
@Controller({ version: ['1'], path: 'localizations' })
@UseGuards(RoleGuard)
export class LocalizationController {
  constructor(private readonly service: LocalizationService) {}


  @Get(':id')
  @ApiOperation({ summary: 'Get a single localization by ID' })
  @OpenApiResponses([200, 404, 500])
  async show(@Param('id') id: string, @Res() res: Response) {
    const response = await this.service.show(id);
    res.status(response.statusCode).json(response);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a localization' })
  @OpenApiResponses([200, 400, 404, 500])
  async update(
    @Param('id') id: string,
    @Body() body: LocalizationCreateDto,
    @Res() res: Response,
  ) {
    const response = await this.service.update(id, body);
    res.status(response.statusCode).json(response);
  }
}