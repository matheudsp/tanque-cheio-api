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
@Module({
  imports: [TypeOrmModule.forFeature([GasStationEntity,
      PriceHistoryEntity,
      ProductEntity,
      LocalizationEntity,
      PermissionsEntity,])],
  controllers: [PriceHistoryController],
  providers: [
    CacheRequestService,
    PermissionsRepository,
    CacheRequestService,
    PriceHistoryService,
    PriceHistoryRepository,
  ],
  exports: [PriceHistoryRepository, PriceHistoryService],
})
export class PriceHistoryModule {}
