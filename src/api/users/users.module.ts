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

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, PermissionsEntity])],
  controllers: [UsersController],
  providers: [
    JwtService,
    JwtAuthService,
    CacheRequestService,
    UsersService,
    UsersRepository,
    PermissionsRepository,
  ],
})
export class UsersModule {}