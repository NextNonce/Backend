import { RateLimiterStoreAbstract } from 'rate-limiter-flexible';
import { RateLimiterFlexibleOptions } from '@/rate-limit/types/rate-limit.types';

export const RATE_LIMITER_PROVIDER = Symbol('RATE_LIMITER_PROVIDER');

export interface RateLimiterProvider {
    createLimiter(
        options: RateLimiterFlexibleOptions,
    ): Promise<RateLimiterStoreAbstract>
}