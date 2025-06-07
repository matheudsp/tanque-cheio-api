import { Module } from '@nestjs/common';
import { PriceHistoryController } from './price-history.controller';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';

import { JwtService } from '@nestjs/jwt';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { PriceHistoryRepository } from './repositories/price-history.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistoryService } from './price-history.service';
import { ProductEntity } from '@/database/entity/product.entity';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { RolesEntity } from '@/database/entity/roles.entity';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { ResourceEntity } from '@/database/entity/resources.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GasStationEntity,
      PriceHistoryEntity,
      ProductEntity,
      LocalizationEntity,
      PermissionsEntity,
      RolesEntity,ResourceEntity
    ]),
  ],
  controllers: [PriceHistoryController],
  providers: [
    CacheRequestService,
    PermissionsRepository,
    RolesRepository,
    CacheRequestService,
    ResourceRepository,
    PriceHistoryService,
    PriceHistoryRepository,
    JwtGuardService,
    PermissionsService,
  ],
  exports: [PriceHistoryRepository, PriceHistoryService],
})
export class PriceHistoryModule {}
