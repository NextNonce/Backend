export const CACHE_PROVIDER = Symbol('CACHE_PROVIDER');

// Interface defining the core operations the underlying provider must support
export interface CacheProvider {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    getWithMetadata<T>(
        key: string,
    ): Promise<{ value: T; ageInSeconds: number } | undefined>;
}
