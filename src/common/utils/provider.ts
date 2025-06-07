import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Provider } from '@nestjs/common';
import { RateLimiterGuard } from '../guards/rate-limiter/rate-limiter.guard';
import { AuthGuard } from '../guards/auth/auth.guard';

export const ThrottlerProvider: Provider = {
  provide: 'APP_GUARD',
  useClass: RateLimiterGuard,
};

export const CacheRedisProvider: Provider = {
  provide: APP_INTERCEPTOR,
  useClass: CacheInterceptor,
};

export const AuthProvider: Provider = {
  provide: 'APP_GUARD',
  useClass: AuthGuard
}