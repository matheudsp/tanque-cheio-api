import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasStationService } from './gas-station.service';
import { GasStationController } from './gas-station.controller';
import { GasStation } from '@/database/entity/gas-station.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
import { Product } from '@/database/entity/product.entity';
import { Localization } from '@/database/entity/localization.entity';


@Module({
  imports: [TypeOrmModule.forFeature([GasStation,PriceHistory, Product,Localization])],
  controllers: [GasStationController],
  providers: [GasStationService],
  // exports: [GasStationService],
})
export class GasStationModule {}
