import { HasRoleRepository } from '@/api/has-roles/repositories/has-roles.repository';
import { HasRolesEntity } from '@/database/entity/has-roles.entity';
import { JwtService } from '@nestjs/jwt';
import { LocalController } from './local.controller';
import { LocalService } from './local.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/database/entity/user.entity';
import { UsersRepository } from '@/api/users/repositories/users.repository';
import { AuthGuard } from '@/common/guards/auth/auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, HasRolesEntity])],
  controllers: [LocalController],
  providers: [LocalService, JwtService, UsersRepository, HasRoleRepository, AuthGuard],
})
export class LocalModule {}