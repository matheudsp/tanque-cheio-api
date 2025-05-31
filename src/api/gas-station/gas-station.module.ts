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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GasStationEntity,
      PriceHistoryEntity,
      ProductEntity,
      LocalizationEntity,
      PermissionsEntity,
    ]),
  ],
  controllers: [GasStationController],
  providers: [
    GasStationService,
    JwtService,
    CacheRequestService,
    PermissionsRepository,
    GasStationRepository,
    PriceHistoryRepository,
    ProductRepository,
    LocalizationRepository,
  ],
  exports: [GasStationService, GasStationRepository],
})
export class GasStationModule {}
