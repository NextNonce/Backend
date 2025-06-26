import { CacheMSetItem } from '@/cache/interfaces/cache-mset-item.interface';

export const CACHE_PROVIDER = Symbol('CACHE_PROVIDER');

// Interface defining the core operations the underlying provider must support
export interface CacheProvider {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    getWithMetadata<T>(
        key: string,
    ): Promise<{ value: T; ageInSeconds: number } | undefined>;
    /**
     * Retrieves multiple keys from the cache in a single operation.
     * @param keys An array of keys to retrieve.
     * @returns A promise that resolves to an array of values. The order of
     * values matches the order of the keys. If a key is not found, the
     * corresponding array element will be undefined.
     */
    mget<T>(keys: string[]): Promise<(T | undefined)[]>;

    /**
     * Sets multiple key-value pairs in the cache in a single operation.
     * @param items An array of objects, each with a key, value, and optional TTL.
     */
    mset<T>(items: CacheMSetItem<T>[]): Promise<void>;

    mgetWithMetadata<T>(
        keys: string[],
    ): Promise<({ value: T; ageInSeconds: number } | undefined)[]>;
}
