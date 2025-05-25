import { Module } from '@nestjs/common';
import { CollectorModule } from './collector/gas-station.module';

@Module({
  imports: [CollectorModule],
  controllers: [],
  providers: [],
})
export class ApiModule {}
