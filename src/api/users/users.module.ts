import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { JwtAuthService } from '@/common/services/jwt-auth/jwt-auth.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PermissionsEntity } from '@/database/entity/permissions.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/database/entity/user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { ResourceEntity } from '@/database/entity/resources.entity';
import { RolesEntity } from '@/database/entity/roles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, PermissionsEntity, ResourceEntity, RolesEntity ])],
  controllers: [UsersController],
  providers: [
    JwtService,
    JwtAuthService,
    CacheRequestService,
    UsersService,
    UsersRepository,
    PermissionsRepository,
    JwtGuardService,
    PermissionsService,
    ResourceRepository,
    RolesRepository,
  ],
})
export class UsersModule {}
