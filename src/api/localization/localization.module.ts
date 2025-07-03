import { Module } from '@nestjs/common';
import { LocalizationService } from './localization.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { LocalizationRepository } from './repositories/localization.repository';
import { HttpModule } from '@nestjs/axios';
import { LocalizationController } from './localization.controller';
import { ConfigService } from '@nestjs/config';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { RolesEntity } from '@/database/entity/roles.entity';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { GeocodingService } from './services/geocoding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LocalizationEntity,
      PermissionsEntity,
      RolesEntity,
      ResourceEntity,
    ]),
    HttpModule.register({}),
  ],
  controllers: [LocalizationController],
  providers: [
    GeocodingService,
    LocalizationService,
    LocalizationRepository,
    ConfigService,
    CacheRequestService,
    PermissionsRepository,
    JwtGuardService,
    PermissionsService,
    ResourceRepository,
    RolesRepository,
  ],
  exports: [LocalizationRepository, LocalizationService],
})
export class LocalizationModule {}
