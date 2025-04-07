import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import IORedis from 'ioredis';
import { ConfigModule } from '@nestjs/config';

const CacheProvider = {
    provide: 'REDIS_CLIENT',
    useFactory: async () => {
        const redis = new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
        });

        // Ensure Redis is connected before injecting it
        await redis.ping();

        return redis;
    },
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [CacheProvider, CacheService],
    exports: [CacheProvider, CacheService],
})
export class CacheModule {}
