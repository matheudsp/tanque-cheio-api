import { RoleGuard } from '@/common/guards/role/role.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { Request, Response } from 'express';
import { FavoriteCreateDto } from './dtos/favorites.dto';
import { ResponseApi } from '@/common/utils/response-api';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@Controller({ version: ['1'], path: 'favorites' })
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all favorite stations and products for the current user',
  })
  @OpenApiResponses([200, 401, 500])
  async getMyFavorites(@Res() res: Response, @Req() req: Request) {
    const userId = req.user!.user_id;
    const r = await this.service.getFavorites(userId);
    res.status(r.statusCode).send(r);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a station and product to favorites' })
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
  @ApiOperation({ summary: 'Remove a station and product from favorites' })
  @ApiQuery({
    name: 'productId',
    required: true,
    type: String,
    description: 'ID of the product to remove from favorites',
  })
  @OpenApiResponses([200, 400, 401, 404, 500])
  async removeFavorite(
    @Req() req: Request,
    @Param('stationId') stationId: string,
    @Query('productId') productId: string,
    @Res() res: Response
  ) {
    const userId = req.user!.user_id;
    const r = await this.service.removeFavorite(userId, stationId, productId);
     res.status(r.statusCode).send(r);

  }
}
