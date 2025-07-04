import { HasRoleRepository } from '@/api/has-roles/repositories/has-roles.repository';
import { HasRolesEntity } from '@/database/entity/has-roles.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalController } from './local.controller';
import { LocalService } from './local.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/database/entity/user.entity';
import { UsersRepository } from '@/api/users/repositories/users.repository';
import { JwtGuardService } from '@/common/services/jwt-auth/jwt-guard.service';
import { RolesRepository } from '@/api/roles/repositories/roles.repository';
import { RolesEntity } from '@/database/entity/roles.entity';


@Module({
  imports: [TypeOrmModule.forFeature([UserEntity,HasRolesEntity, RolesEntity])],
  controllers: [LocalController],
  providers: [LocalService, JwtService, UsersRepository, HasRoleRepository, RolesRepository, JwtGuardService],
})
export class LocalModule {}