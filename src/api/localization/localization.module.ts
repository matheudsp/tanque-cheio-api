import { Module } from '@nestjs/common';
import { LocalizationService } from './localization.service';

@Module({
  providers: [LocalizationService]
})
export class LocalizationModule {}
