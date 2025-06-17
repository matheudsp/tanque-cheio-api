import { RoleGuard } from '@/common/guards/role/role.guard';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { Request, Response } from 'express';
import type { FavoriteCreateDto } from './dtos/favorites.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'favorites' })
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  
  @Get()
  @ApiOperation({ summary: 'Get all favorite stations for the current user' })
  @OpenApiResponses([200, 401, 500])
  async getMyFavorites(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.user_id;
    const r = await this.service.getFavorites(userId);
    res.status(r.statusCode).send(r);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a station to favorites' })
  @OpenApiResponses([201, 400, 401, 404, 409, 500])
  async addFavorite(
    @Req() req: Request,
    @Body() body: FavoriteCreateDto,
    @Res() res: Response,
  ) {
    const userId = req.user!.user_id;
    const r = await this.service.addFavorite(userId, body);
    res.status(r.statusCode).send(r);
  }

  @Delete(':stationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a station from favorites' })
  @OpenApiResponses([200, 400, 401, 404, 500])
  async removeFavorite(
    @Req() req: Request,
    @Param('stationId') stationId: string,
    @Res() res: Response,
  ) {
    const userId = req.user!.user_id;
    const r = await this.service.removeFavorite(userId, stationId);
    res.status(r.statusCode).send(r);
  }
}
