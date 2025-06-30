import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushNotificationService } from './push-notifications.service';
import { PushTokenEntity } from '../../database/entity/push_token.entity';

import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PushNotificationsRepository } from './repositories/push-notifications.repository';
import { JwtService } from '@nestjs/jwt';
import { PushNotificationsController } from './push-notifications.controller';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';
import { FavoritesRepository } from '../favorites/repositories/favorites.repository';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { UserFavoriteStationEntity } from '@/database/entity/user-favorite-station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushTokenEntity,PriceHistoryEntity,UserFavoriteStationEntity])],
  providers: [
    PushNotificationService,
    JwtService,
    JwtGuardService,
    PushNotificationsRepository,
    PushNotificationService,
    PriceHistoryRepository,
    FavoritesRepository
  ],
  controllers: [PushNotificationsController],
  exports: [PushNotificationService],
})
export class PushNotificationsModule {}
