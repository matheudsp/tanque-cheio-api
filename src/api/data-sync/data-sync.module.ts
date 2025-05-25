import { Module } from '@nestjs/common';
import { DataSyncService } from './data-sync.service';
import { DataSyncController } from './data-sync.controller';
import { FileProcessorCsvService } from './services/file-processor-csv.service';
import { FileTransformerCsv } from './services/file-transformer-csv.service';
import { GasStation } from '@/database/entity/gas-station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([GasStation]),],
  providers: [DataSyncService, FileProcessorCsvService,FileTransformerCsv],
  controllers: [DataSyncController],
  exports: [],
})
export class DataSyncModule {}
