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
import { AuthGuard } from '@/common/guards/auth/auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocalizationEntity, PermissionsEntity]),
    HttpModule.register({
      timeout: 10000, // 10 segundos de timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [LocalizationController],
  providers: [LocalizationService, LocalizationRepository, ConfigService, PermissionsRepository,AuthGuard],
  exports: [LocalizationRepository, LocalizationService],
})
export class LocalizationModule {}
