import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { ProductEntity } from '@/database/entity/product.entity';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { DataSyncController } from './data-sync.controller';
import { DataSyncService } from './data-sync.service';
import { FileProcessorService } from './services/file-processor-csv.service';
import { FileDownloaderService } from './services/file-downloader.service';
import { XlsxToCsvConverterService } from './services/xlsx-to-csv-converter.service';
import { CsvProcessor } from './processors/csv-file.processor';
import { CsvRowValidator } from './validators/csv-row.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([GasStationEntity, ProductEntity, LocalizationEntity, PriceHistoryEntity]),
    HttpModule.register({
      timeout: 120000, // 2 minutes if the datasheet is a large file
      maxRedirects: 5,
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024, // 100MB
    }),
  ],
  providers: [
    DataSyncService,
    FileProcessorService,
    FileDownloaderService,
    XlsxToCsvConverterService,
    DataSyncService,
    CsvProcessor,
    CsvRowValidator,
  ],
  controllers: [DataSyncController],
  exports: [],
})
export class DataSyncModule {}
 