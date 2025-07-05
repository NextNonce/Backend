import { RateLimiterProvider } from '@/rate-limit/interfaces/rate-limiter-provider.interface';
import {
    RateLimiterRedis,
    RateLimiterStoreAbstract,
} from 'rate-limiter-flexible';
import { RedisClientService } from '@/common/redis/redis-client.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import Redis from 'ioredis';
import { RateLimiterFlexibleOptions } from '@/rate-limit/types/rate-limit.types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisRateLimiterProvider implements RateLimiterProvider {
    private readonly logger: AppLoggerService;
    private dedicatedClient: Redis;

    constructor(private readonly redisClientService: RedisClientService) {
        this.logger = new AppLoggerService(RedisRateLimiterProvider.name);
    }

    async createLimiter(
        options: RateLimiterFlexibleOptions,
    ): Promise<RateLimiterStoreAbstract> {
        this.logger.log(
            `Creating a new RateLimiterRedis with keyPrefix: ${options.keyPrefix}`,
        );

        if (!this.dedicatedClient) {
            this.dedicatedClient = await this.redisClientService.createClient(
                'rate-limiter',
                { enableOfflineQueue: false },
            );
        }

        return new RateLimiterRedis({
            storeClient: this.dedicatedClient,
            ...options,
        });
    }

    async handleConsumeError(rejection: Error): Promise<void> {
        if (this.dedicatedClient.status !== 'ready') {
            await new Promise<void>(resolve =>
                this.dedicatedClient.once('ready', () => resolve()),
            );
        } else {
            // already ready but still got an error: back off a bit
            await new Promise((r) => setTimeout(r, 100));
        }
        this.logger.log(`Resuming rate‐limiter.consume() now that Redis is ready.`);
    }
}
