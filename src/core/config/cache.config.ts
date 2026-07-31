import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis, { Keyv } from '@keyv/redis';
// import { CacheableMemory } from 'cacheable';

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    ttl: 300,
    stores: [
      //   new Keyv({
      //     store: new CacheableMemory({ ttl: 60000 }),
      //   }),
      new KeyvRedis(configService.get<string>('REDIS_URL')),
    ],
  }),
};
