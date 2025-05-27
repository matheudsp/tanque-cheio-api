import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';

// Controllers
import { DataSyncController } from './data-sync.controller';

// Legacy services (for backward compatibility)
import { DataSyncService } from './data-sync.service';
import { FileProcessorService } from './services/file-processor-csv.service';

// File processing services
import { FileDownloaderService } from './services/file-downloader.service';
import { XlsxToCsvConverterService } from './services/xlsx-to-csv-converter.service';
import { FileTransformerService } from './services/file-transformer.service';

// SOLID components for CSV processing
import { CsvProcessor } from './processors/csv-file.processor';
import { CsvRowValidator } from './validators/csv-row.validator';
import { CsvToEntitiesMapper } from './mappers/csv-to-entities.mapper';


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
    // Legacy services (for backward compatibility)
    DataSyncService,
    FileProcessorService,

    // File processing services
    FileDownloaderService,
    XlsxToCsvConverterService,
    FileTransformerService,

    // SOLID components for CSV processing
    CsvProcessor,
    CsvRowValidator,
    CsvToEntitiesMapper,
    
  ],
  controllers: [DataSyncController],
  exports: [
    CsvProcessor,
    FileProcessorService,
    
    FileTransformerService,
    FileDownloaderService,
    XlsxToCsvConverterService,
  ],
})
export class DataSyncModule {}