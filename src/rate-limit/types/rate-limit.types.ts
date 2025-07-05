import { IRateLimiterOptions } from 'rate-limiter-flexible';

export type RateLimiterFlexibleOptions = Omit<
    IRateLimiterOptions,
    'storeClient'
>;
