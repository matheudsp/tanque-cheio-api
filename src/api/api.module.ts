import { Module } from '@nestjs/common';
import { GasStationModule } from './gas-station/gas-station.module';
import { DataSyncModule } from './data-sync/data-sync.module';
import { LocalizationModule } from './localization/localization.module';
import { PriceHistoryModule } from './price-history/price-history.module';
import { ProductModule } from './product/product.module';
import { HealthModule } from './health/health.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { HasRolesModule } from './has-roles/has-roles.module';
import { ResourcesModule } from './resources/resources.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';

@Module({
  imports: [
    GasStationModule,
    DataSyncModule,
    LocalizationModule,
    PriceHistoryModule,
    ProductModule,
    HealthModule,
    RolesModule,
    UsersModule,
    AuthModule,
    PermissionsModule,
    HasRolesModule,
    ResourcesModule,
    FavoritesModule,
    PushNotificationsModule,
  ],
  // controllers: [],
  providers: [],
})
export class ApiModule {}
