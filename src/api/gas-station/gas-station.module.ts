import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasStationService } from './gas-station.service';
import { GasStationController } from './gas-station.controller';
import {  GasStation } from '@/database/entity/gas-station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GasStation])],
  controllers: [GasStationController],
  providers: [GasStationService],
  // exports: [GasStationService],
})
export class GasStationModule {}