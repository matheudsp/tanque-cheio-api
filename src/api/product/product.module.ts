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
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesEntity } from '@/database/entity/roles.entity';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { RolesRepository } from '../roles/repositories/roles.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, PermissionsEntity,RolesEntity,ResourceEntity])],

  controllers: [ProductController],
  providers: [
    CacheRequestService,
    PermissionsRepository,
    ProductService,
    ProductRepository,
    JwtGuardService,PermissionsService,ResourceRepository,RolesRepository
  ],
  exports: [ProductRepository, ProductService],
})
export class ProductModule {}
