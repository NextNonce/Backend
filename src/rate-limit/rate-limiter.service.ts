import { Injectable } from '@nestjs/common';
import { RedisClientService } from '@/common/redis/redis-client.service';
import Redis from 'ioredis';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import {
    IRateLimiterOptions,
    RateLimiterRedis,
    RateLimiterRes,
} from 'rate-limiter-flexible';

export type RateLimiterFlexibleOptions = Omit<
    IRateLimiterOptions,
    'storeClient'
>;

@Injectable()
export class RateLimiterService {
    private dedicatedClient: Redis;
    private readonly logger: AppLoggerService;

    constructor(private readonly redisClientService: RedisClientService) {
        this.logger = new AppLoggerService(RateLimiterService.name);
    }

    async createLimiter(
        options: RateLimiterFlexibleOptions,
    ): Promise<RateLimiterRedis> {
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

    async waitForGoAhead(
        limiter: RateLimiterRedis,
        key: string,
    ): Promise<void> {
        let isAllowed = false;
        while (!isAllowed) {
            try {
                await limiter.consume(key);
                isAllowed = true;
            } catch (rejRes) {
                if (rejRes instanceof Error) {
                    // This is a Redis error, we should probably not retry indefinitely.
                    this.logger.error(
                        `Redis error during rate limit consumption, stopping retry: ${rejRes.message}`,
                    );
                    // Re-throwing here will crash the request, which is appropriate for a DB error.
                    throw rejRes;
                } else if (rejRes instanceof RateLimiterRes) {
                    // The rate limit was exceeded. Wait for the specified duration and try again.
                    const retryAfter =
                        (limiter.duration * 1000) / limiter.points;
                    this.logger.warn(
                        `Rate limit exceeded for keyPrefix '${limiter.keyPrefix}'. Waiting ${retryAfter / 1000}s before retrying...`,
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, retryAfter),
                    );
                }
            }
        }
    }
}
