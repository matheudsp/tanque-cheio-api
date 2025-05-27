import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';

// Controllers
import { DataSyncController } from './data-sync.controller';

// Services
import { DataSyncService } from './data-sync.service';
import { FileProcessorCsvService } from './services/file-processor-csv.service';
import { FileTransformerCsv } from './services/file-transformer-csv.service';

// New refactored components
import { CsvFileProcessor } from './processors/csv-file.processor';
import { CsvRowValidator } from './validators/csv-row.validator';
import { CsvToEntitiesMapper } from './mappers/csv-to-gas-station.mapper';
import { EntitiesBatchRepository } from './repositories/gas-station-batch.repository';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GasStation]),
    TypeOrmModule.forFeature([Product]),
    TypeOrmModule.forFeature([Localization]),
    TypeOrmModule.forFeature([PriceHistory]),
  ],
  providers: [
    // Legacy services (for backward compatibility)
    DataSyncService,
    FileProcessorCsvService,
    FileTransformerCsv,

    // New SOLID components
    CsvFileProcessor,
    CsvRowValidator,
    CsvToEntitiesMapper,
    EntitiesBatchRepository,
  ],
  controllers: [DataSyncController],
  exports: [CsvFileProcessor, EntitiesBatchRepository],
})
export class DataSyncModule {}
