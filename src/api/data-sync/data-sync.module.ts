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
import { PermissionsEntity } from '@/database/entity/permissions.entity';

import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { DataSyncLogEntity } from '@/database/entity/data-sync-log.entity';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { RolesEntity } from '@/database/entity/roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GasStationEntity,
      ProductEntity,
      LocalizationEntity,
      PriceHistoryEntity,
      PermissionsEntity,
      DataSyncLogEntity,
      ResourceEntity,RolesEntity
    ]),
    HttpModule.register({
      timeout: 120000, // 2 minutes if the datasheet is a large file
      maxRedirects: 5,
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024, // 100MB
    }),
  ],
  providers: [
    PermissionsRepository,
    DataSyncService,
    FileProcessorService,
    FileDownloaderService,
    XlsxToCsvConverterService,
    CsvProcessor,
    CsvRowValidator,
    CacheRequestService,
    JwtGuardService,PermissionsService,ResourceRepository,RolesRepository
  ],
  controllers: [DataSyncController],
  exports: [],
})
export class DataSyncModule {}
