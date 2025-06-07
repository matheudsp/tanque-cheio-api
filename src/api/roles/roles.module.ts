import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { RolesController } from './roles.controller';
import { RolesEntity } from '@/database/entity/roles.entity';
import { RolesRepository } from './repositories/roles.repository';
import { RolesService } from './roles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { ResourceEntity } from '@/database/entity/resources.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolesEntity, PermissionsEntity, ResourceEntity])],
  controllers: [RolesController],
  providers: [
    JwtService,
    CacheRequestService,
    RolesService,
    RolesRepository,
    PermissionsRepository,
    JwtGuardService,PermissionsService,ResourceRepository
  ],
})
export class RolesModule {}