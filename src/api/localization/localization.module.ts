import { Module } from '@nestjs/common';
import { LocalizationService } from './localization.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { LocalizationRepository } from './repositories/localization.repository';

@Module({
  imports: [TypeOrmModule.forFeature([LocalizationEntity])],
  providers: [LocalizationService, LocalizationRepository],
  exports: [LocalizationRepository],
})
export class LocalizationModule {}
