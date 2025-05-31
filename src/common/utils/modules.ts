import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerAsyncOptions, seconds } from '@nestjs/throttler';
import { throttler, trackerThrottler } from './throttler';

import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { CacheableMemory } from 'cacheable';
import Keyv from 'keyv';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { createKeyv } from '@keyv/redis';

const throttlerModuleConfig: ThrottlerAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    throttlers: throttler,
    getTracker: trackerThrottler,
    storage: new ThrottlerStorageRedisService({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
      db: parseInt(configService.get('REDIS_DB', '0'), 10),
    }),
  }),
};

const cacheRedisModuleConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
     const redisConnection = `redis://${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', '6379')}`;
    const appName = config
      .get('APP_NAME', 'app')
      .toLowerCase()
      .replace(/ /g, '_');

    const storeCache = new CacheableMemory({ ttl: seconds(300), lruSize: 1000});
    const namespace = `cache_${appName}`;
    return {
      stores: [
        new Keyv({ store: storeCache }),
        createKeyv(redisConnection, { namespace}),
      ],
    };
  },
};

export { throttlerModuleConfig, cacheRedisModuleConfig };