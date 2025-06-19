import { RoleGuard } from '@/common/guards/role/role.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
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

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@Controller({ version: ['1'], path: 'favorites' })
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorites for the current user' })
  @OpenApiResponses([200, 401, 500])
  async getMyFavorites(@Req() req: Request, @Res() res: Response) {
    const user_id = req.user!.user_id;
    const response = await this.service.getFavorites(user_id);
    res.status(response.statusCode).send(response);
  }

  @Post()
  @ApiOperation({ summary: 'Add a station and product to favorites' })
  @OpenApiResponses([201, 400, 401, 404, 409, 500])
  async addFavorite(
    @Req() req: Request,
    @Body() body: FavoriteCreateDto,
    @Res() res: Response,
  ) {
    const user_id = req.user!.user_id;
    const response = await this.service.addFavorite(user_id, body);
    res.status(response.statusCode).send(response);
  }

  @Delete(':station_id')
  @ApiOperation({ summary: 'Remove a station and product from favorites' })
  @ApiQuery({ name: 'product_id', required: true, type: String })
  @OpenApiResponses([200, 400, 401, 404, 500])
  async removeFavorite(
    @Req() req: Request,
    @Param('station_id') station_id: string,
    @Query('product_id') product_id: string,
    @Res() res: Response,
  ) {
    const user_id = req.user!.user_id;
    const response = await this.service.removeFavorite(
      user_id,
      station_id,
      product_id,
    );
    res.status(response.statusCode).send(response);
  }
}
