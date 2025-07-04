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
import { PermissionsService } from '../permissions/permissions.service';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { RolesEntity } from '@/database/entity/roles.entity';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushTokenEntity,
      PriceHistoryEntity,
      UserFavoriteStationEntity,
      PermissionsEntity,
      RolesEntity,
      ResourceEntity,
    ]),
  ],
  providers: [
    PushNotificationService,
    JwtService,
    JwtGuardService,
    PushNotificationsRepository,
    PushNotificationService,
    PriceHistoryRepository,
    FavoritesRepository,
    JwtGuardService,
    CacheRequestService,
    JwtGuardService,
    PermissionsService,
    ResourceRepository,
    RolesRepository,
    PermissionsRepository,
  ],
  controllers: [PushNotificationsController],
  exports: [PushNotificationService],
})
export class PushNotificationsModule {}
