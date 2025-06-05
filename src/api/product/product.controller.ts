import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from '@/common/guards/role/role.guard';
import { CacheRequestInterceptor } from '@/common/interceptor/cache-request/cache-request.interceptor';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { Response } from 'express';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@UseInterceptors(CacheRequestInterceptor)
@Controller({ version: ['1'], path: 'products' })
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('')
  @ApiOperation({
    summary: 'Obter estatísticas dos produtos',
    description: 'Retorna os estatísticas',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async getAll(@Res() res: Response) {
    const result = await this.productService.findAll();
    return res.status(result.statusCode).send(result);
  }

    @Get('stats')
  @ApiOperation({
    summary: 'Obter estatísticas dos produtos',
    description: 'Retorna os estatísticas',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async Stats(@Res() res: Response) {
    const result = await this.productService.getProduct();
    return res.status(result.statusCode).send(result);
  }


  @Get(':productId')
  @ApiOperation({
    summary: 'Get Product by ID',
    description: 'Get Product by ID',
  })
  @OpenApiResponses([200, 400, 401, 403, 404, 500])
  async find(@Param('productId') productId: string, @Res() res: Response) {
    const result = await this.productService.findById(productId);
    res.status(result.statusCode).send(result);
  }
}
