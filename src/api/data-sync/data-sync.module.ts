import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
import { DataSyncController } from './data-sync.controller';
import { DataSyncService } from './data-sync.service';
import { FileProcessorService } from './services/file-processor-csv.service';
import { FileDownloaderService } from './services/file-downloader.service';
import { XlsxToCsvConverterService } from './services/xlsx-to-csv-converter.service';
import { CsvProcessor } from './processors/csv-file.processor';
import { CsvRowValidator } from './validators/csv-row.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([GasStation, Product, Localization, PriceHistory]),
    HttpModule.register({
      timeout: 120000, // 2 minutes for large file downloads
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
 