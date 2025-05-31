import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './repositories/product.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '@/database/entity/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],

  controllers: [ProductController],
  providers: [ProductRepository],
  exports: [ProductRepository],
})
export class ProductModule {}
