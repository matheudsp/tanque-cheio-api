import { ApiModule } from '@/api/api.module';
import { ConfigModule } from '@nestjs/config';

import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '@/config/database';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  cacheRedisModuleConfig,
  throttlerModuleConfig,
} from './common/utils/modules';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterGuard } from './common/guards/rate-limiter/rate-limiter.guard';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync(throttlerModuleConfig),
    CacheModule.registerAsync(cacheRedisModuleConfig),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30d' }, // default: 30 dias
      global: true,
    }),
    TypeOrmModule.forRoot(databaseConfig),
    ConfigModule.forRoot(),
    ApiModule,
  ],
  // controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
