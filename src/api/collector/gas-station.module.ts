import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectorService } from './gas-station.service';
import { CollectorController } from './gas-station.controller';
import {  GasStation } from '@/database/entity/gas-station.entity';
import { ProcessCsvService } from './services/process-csv.service';

@Module({
  imports: [TypeOrmModule.forFeature([GasStation])],
  controllers: [CollectorController],
  providers: [CollectorService , ProcessCsvService],
  exports: [CollectorService , ProcessCsvService],
})
export class CollectorModule {}