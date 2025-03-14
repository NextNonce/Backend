import { Injectable, Inject } from '@nestjs/common';
import IORedis from 'ioredis';


@Injectable()
export class CacheService {
    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: IORedis) {}

    async get<T>(key: string): Promise<T | undefined> {
        const data = await this.redisClient.get(key);
        return data ? (JSON.parse(data) as T) : undefined;
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        const stringValue = JSON.stringify(value);
        if (ttlSeconds) {
            await this.redisClient.set(key, stringValue, 'EX', ttlSeconds);
        } else {
            await this.redisClient.set(key, stringValue);
        }
    }

    async del(key: string): Promise<void> {
        await this.redisClient.del(key);
    }

    async flush(): Promise<void> {
        await this.redisClient.flushall();
    }
}
