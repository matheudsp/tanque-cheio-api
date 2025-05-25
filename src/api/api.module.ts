import { Module } from '@nestjs/common';
import { GasStationModule } from './gas-station/gas-station.module';
import { DataSyncModule } from './data-sync/data-sync.module';

@Module({
  imports: [GasStationModule, DataSyncModule],
  controllers: [],
  providers: [],
})
export class ApiModule {}
