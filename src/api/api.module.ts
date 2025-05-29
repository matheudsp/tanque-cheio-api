import { Module } from '@nestjs/common';
import { GasStationModule } from './gas-station/gas-station.module';
import { DataSyncModule } from './data-sync/data-sync.module';
import { LocalizationModule } from './localization/localization.module';
import { PriceHistoryModule } from './price-history/price-history.module';
import { ProductModule } from './product/product.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [GasStationModule, DataSyncModule, LocalizationModule, PriceHistoryModule, ProductModule, HealthModule],
  controllers: [],
  providers: [],
})
export class ApiModule {}
