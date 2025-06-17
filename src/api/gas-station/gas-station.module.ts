import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasStationService } from './gas-station.service';
import { GasStationController } from './gas-station.controller';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { ProductEntity } from '@/database/entity/product.entity';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { JwtService } from '@nestjs/jwt';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { GasStationRepository } from './repositories/gas-station.repository';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';
import { ProductRepository } from '../product/repositories/product.repository';
import { LocalizationRepository } from '../localization/repositories/localization.repository';
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
      RolesEntity,
      ResourceEntity
    ]),
  ],
  controllers: [GasStationController],
  providers: [
    ResourceRepository,
    GasStationService,
    JwtService,
    CacheRequestService,
    PermissionsRepository,
    RolesRepository,
    GasStationRepository,
    PriceHistoryRepository,
    ProductRepository,
    LocalizationRepository,
    JwtGuardService,
    PermissionsService,
  ],
  exports: [GasStationService, GasStationRepository],
})
export class GasStationModule {}
