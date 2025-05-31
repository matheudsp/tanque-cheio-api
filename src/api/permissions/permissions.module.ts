import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtAuthService } from '@/common/services/jwt-auth/jwt-auth.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesEntity } from '@/database/entity/roles.entity';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionsEntity, RolesEntity, ResourceEntity]),
  ],
  controllers: [PermissionsController],
  providers: [
    JwtService,
    JwtAuthService,
    CacheRequestService,
    PermissionsService,
    PermissionsRepository,
    RolesRepository,
    ResourceRepository,
  ],
})
export class PermissionsModule {}