import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { ResourceRepository } from './repositories/resources.repository';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { RolesEntity } from '@/database/entity/roles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceEntity, PermissionsEntity, RolesEntity, ResourceEntity])],
  controllers: [ResourcesController],
  providers: [
    JwtService,
    CacheRequestService,
    ResourcesService,
    ResourceRepository,
    PermissionsRepository,
    JwtGuardService,PermissionsService,ResourceRepository,RolesRepository
  ],
})
export class ResourcesModule {}