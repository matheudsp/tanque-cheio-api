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
import { CsvToGasStationMapper } from './mappers/csv-to-gas-station.mapper';
import { GasStationBatchRepository } from './repositories/gas-station-batch.repository';
import { Localizacao } from '@/database/entity/location.entity';
import { Produto } from '@/database/entity/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GasStation]),
    TypeOrmModule.forFeature([Produto]),
    TypeOrmModule.forFeature([Localizacao]),
  ],
  providers: [
    // Legacy services (for backward compatibility)
    DataSyncService,
    FileProcessorCsvService,
    FileTransformerCsv,

    // New SOLID components
    CsvFileProcessor,
    CsvRowValidator,
    CsvToGasStationMapper,
    GasStationBatchRepository,
  ],
  controllers: [DataSyncController],
  exports: [CsvFileProcessor, GasStationBatchRepository],
})
export class DataSyncModule {}
