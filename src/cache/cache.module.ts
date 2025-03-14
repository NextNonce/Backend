import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import IORedis from 'ioredis';

const CacheProvider = {
    provide: 'REDIS_CLIENT',
    useFactory: async () => {
        return new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
        });
    }
}

@Module({
    providers: [CacheProvider, CacheService],
    exports: [CacheProvider, CacheService]
})
export class CacheModule {}
