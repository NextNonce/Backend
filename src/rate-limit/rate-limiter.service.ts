import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import {
    RateLimiterRes,
    RateLimiterStoreAbstract,
} from 'rate-limiter-flexible';
import {
    RATE_LIMITER_PROVIDER,
    RateLimiterProvider,
} from '@/rate-limit/interfaces/rate-limiter-provider.interface';
import { RateLimiterFlexibleOptions } from '@/rate-limit/types/rate-limit.types';

@Injectable()
export class RateLimiterService {
    private readonly logger: AppLoggerService;

    constructor(
        @Inject(RATE_LIMITER_PROVIDER)
        private readonly rateLimiterProvider: RateLimiterProvider,
    ) {
        this.logger = new AppLoggerService(RateLimiterService.name);
    }

    async createLimiter(
        options: RateLimiterFlexibleOptions,
    ): Promise<RateLimiterStoreAbstract> {
        return this.rateLimiterProvider.createLimiter(options);
    }

    async waitForGoAhead(
        limiter: RateLimiterStoreAbstract,
        key: string,
    ): Promise<void> {
        let isAllowed = false;
        while (!isAllowed) {
            try {
                await limiter.consume(key);
                isAllowed = true;
            } catch (rejRes) {
                if (rejRes instanceof Error) {
                    this.logger.error(
                        `Rate limit provider error during rate limit consumption, stopping retry: ${rejRes.message}`,
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
