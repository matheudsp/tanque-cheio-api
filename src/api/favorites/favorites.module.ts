import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtAuthService } from '@/common/services/jwt-auth/jwt-auth.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/database/entity/user.entity';

import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { RolesEntity } from '@/database/entity/roles.entity';
import { UserFavoriteStationEntity } from '@/database/entity/user-favorite-station.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesRepository } from './repositories/favorites.repository';
import { FavoritesService } from './favorites.service';
import { GasStationEntity } from '@/database/entity/gas-station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserFavoriteStationEntity,
      UserEntity,
      PermissionsEntity,
      ResourceEntity,
      RolesEntity,
      GasStationEntity
    ]),
  ],
  controllers: [FavoritesController],
  providers: [
    JwtService,
    JwtAuthService,
    CacheRequestService,
    FavoritesService,
    FavoritesRepository,
    PermissionsRepository,
    JwtGuardService,
    PermissionsService,
    ResourceRepository,
    RolesRepository,
  ],
})
export class FavoritesModule {}
