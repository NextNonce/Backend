import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from '@/rate-limit/rate-limiter.service';
import { RATE_LIMITER_PROVIDER } from '@/rate-limit/interfaces/rate-limiter-provider.interface';
import { RedisRateLimiterProvider } from '@/rate-limit/providers/redis-rate-limiter.provider';

@Global()
@Module({
    providers: [
        {
            provide: RATE_LIMITER_PROVIDER, // Interface token for rate limiter provider
            useClass: RedisRateLimiterProvider, // Concrete implementation of the rate limiter
        },
        RateLimiterService
    ],
    exports: [RateLimiterService],
})
export class RateLimitModule {}
