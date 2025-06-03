import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './repositories/product.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '@/database/entity/product.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtService } from '@nestjs/jwt';
import { PermissionsEntity } from '@/database/entity/permissions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, PermissionsEntity])],

  controllers: [ProductController],
  providers: [
    CacheRequestService,
    PermissionsRepository,
    ProductService,
    ProductRepository
  ],
  exports: [ProductRepository, ProductService],
})
export class ProductModule {}
