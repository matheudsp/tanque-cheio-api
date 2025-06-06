import { HasRoleRepository } from '@/api/has-roles/repositories/has-roles.repository';
import { HasRolesEntity } from '@/database/entity/has-roles.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalController } from './local.controller';
import { LocalService } from './local.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/database/entity/user.entity';
import { UsersRepository } from '@/api/users/repositories/users.repository';
import { PermissionsRepository } from '@/api/permissions/repositories/permissions.repository';
import { PermissionsEntity } from '@/database/entity/permissions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, HasRolesEntity, PermissionsEntity])],
  controllers: [LocalController],
  providers: [LocalService, JwtService, UsersRepository, HasRoleRepository, PermissionsRepository],
})
export class LocalModule {}
