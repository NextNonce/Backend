import { Injectable } from '@nestjs/common';
import { CacheProvider } from '../interfaces/cache-provider.interface';
import {
    AppLoggerService,
    formatMessage,
} from '@/app-logger/app-logger.service'; // Import logger
import { RedisClientService } from '@/common/redis/redis-client.service';
import { CacheMSetItem } from '@/cache/interfaces/cache-mset-item.interface';

// Helper interface for our new string-based storage model
interface CacheWrapper<T> {
    value: T;
    timestamp: number;
}

@Injectable()
export class RedisCacheProvider implements CacheProvider {
    private readonly logger: AppLoggerService;

    constructor(private readonly redisClientService: RedisClientService) {
        this.logger = new AppLoggerService(RedisCacheProvider.name);
    }

    private get redisClient() {
        return this.redisClientService.getClient();
    }

    // --- Implementation of CacheProvider interface ---

    async get<T>(key: string): Promise<T | undefined> {
        try {
            const serializedData = await this.redisClient.get(key);
            if (serializedData === null) {
                this.logger.debug(
                    `GET: Cache MISS for key: ${formatMessage(key)}`,
                );
                return undefined;
            }
            this.logger.debug(`GET: Cache HIT for key: ${formatMessage(key)}`);
            try {
                const wrapper = JSON.parse(serializedData) as CacheWrapper<T>;
                return wrapper.value; // Return only the user's data
            } catch (error) {
                const parseError = error as Error;
                this.logger.error(
                    `GET: Failed to parse JSON from Redis. Data: ${serializedData}, Error: ${parseError.message}, Key: ${formatMessage(key)}`,
                );
                return undefined;
            }
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `GET: Redis error ${redisError.message} for key ${formatMessage(key)}`,
            );
            return undefined; // Or throw
        }
    }

    async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
        try {
            const wrapper: CacheWrapper<T> = {
                value,
                timestamp: Date.now(),
            };
            const stringValue = JSON.stringify(wrapper);

            this.logger.debug(
                `SET: setting cache for key: ${formatMessage(key)}`,
            );

            if (ttlInSeconds && ttlInSeconds > 0) {
                // Use SET with EX option. This is 1 atomic command for set + TTL.
                await this.redisClient.set(
                    key,
                    stringValue,
                    'EX',
                    ttlInSeconds,
                );
            } else {
                await this.redisClient.set(key, stringValue);
            }
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `SET: Redis HSET/EXPIRE error ${redisError.message} for key ${formatMessage(key)}`,
            );
        }
    }

    async del(key: string): Promise<void> {
        try {
            this.logger.debug(
                `DEL: Deleting cache for key: ${formatMessage(key)}`,
            );
            // .del returns the number of keys deleted, await it to ensure completion
            const keysDeleted = await this.redisClient.del(key);
            this.logger.debug(
                `DEL: Deleted ${keysDeleted} keys for key: ${formatMessage(key)}`,
            );
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `DEL: Redis error ${redisError.message} for key ${formatMessage(key)}`,
            );
        }
    }

    async getWithMetadata<T>(
        key: string,
    ): Promise<{ value: T; ageInSeconds: number } | undefined> {
        try {
            const serializedData = await this.redisClient.get(key);
            if (!serializedData) {
                this.logger.debug(
                    `GET: Metadata MISS for key: ${formatMessage(key)}`,
                );
                return undefined;
            }

            const wrapper = JSON.parse(serializedData) as CacheWrapper<T>;
            const ageInSeconds = Math.round(
                (Date.now() - wrapper.timestamp) / 1000,
            );

            this.logger.debug(
                `GET: Metadata HIT for key: ${formatMessage(key)}, Age: ${ageInSeconds}s`,
            );
            return { value: wrapper.value, ageInSeconds };
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `GET: Redis error ${redisError.message} for key ${formatMessage(key)}`,
            );
            return undefined;
        }
    }

    async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
        if (keys.length === 0) {
            return [];
        }
        try {
            const results = await this.redisClient.mget(keys);
            this.logger.debug(`MGET: Cache for ${keys.length} keys.`);

            return results.map((data, index) => {
                if (data === null) {
                    // Cache miss for this key
                    return undefined;
                }
                try {
                    const wrapper = JSON.parse(data) as CacheWrapper<T>;
                    return wrapper.value;
                } catch (e) {
                    const parseError = e as Error;
                    this.logger.error(
                        `MGET: Failed to parse JSON for key ${keys[index]}`,
                        parseError.message,
                    );
                    return undefined;
                }
            });
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `MGET: Redis error in mget: ${redisError.message}`,
            );
            // On a total failure, return an array of undefined matching the input length.
            return new Array(keys.length).fill(undefined) as (T | undefined)[];
        }
    }

    async mset<T>(items: CacheMSetItem<T>[]): Promise<void> {
        if (items.length === 0) {
            return;
        }
        try {
            // IMPORTANT TRADE-OFF: Native MSET does NOT support per-item TTLs.
            // To be command-effective, we sacrifice per-item TTL in this specific function.
            // If TTL is needed, we must use a MULTI pipeline, which increases command count.
            const now = Date.now();
            const keyValuePairs: Record<string, string> = {};
            let usePipeline = false;
            for (const item of items) {
                if (item.ttlInSeconds && item.ttlInSeconds > 0) {
                    usePipeline = true;
                    break; // If any item has a TTL, we must use the pipeline approach
                }
                const wrapper: CacheWrapper<T> = {
                    value: item.value,
                    timestamp: now,
                };
                keyValuePairs[item.key] = JSON.stringify(wrapper);
            }

            if (usePipeline) {
                const multi = this.redisClient.multi();
                items.forEach((item) => {
                    const wrapper: CacheWrapper<T> = {
                        value: item.value,
                        timestamp: now,
                    };
                    if (item.ttlInSeconds) {
                        multi.set(
                            item.key,
                            JSON.stringify(wrapper),
                            'EX',
                            item.ttlInSeconds,
                        );
                    } else {
                        multi.set(item.key, JSON.stringify(wrapper));
                    }
                });
                await multi.exec();
                this.logger.debug(
                    `MSET: TTL detected. Using MULTI pipeline for ${items.length} items.`,
                );
            } else {
                await this.redisClient.mset(keyValuePairs);
                this.logger.debug(
                    `MSET: No TTLs. Using native MSET for ${items.length} items.`,
                );
            }
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(`MSET: Redis error: ${redisError.message}`);
        }
    }

    async mgetWithMetadata<T>(
        keys: string[],
    ): Promise<({ value: T; ageInSeconds: number } | undefined)[]> {
        if (keys.length === 0) {
            return [];
        }

        try {
            // Use Redis MGET to fetch all serialized data in one go
            const serializedResults = await this.redisClient.mget(keys);
            this.logger.debug(
                `MGET: Cache for ${keys.length} keys for metadata lookup.`,
            );

            // Map over the results to parse and add age metadata
            return serializedResults.map((serializedData, index) => {
                const key = keys[index]; // Get the original key for logging

                if (serializedData === null) {
                    return undefined;
                }

                try {
                    const wrapper = JSON.parse(
                        serializedData,
                    ) as CacheWrapper<T>;
                    const ageInSeconds = Math.round(
                        (Date.now() - wrapper.timestamp) / 1000,
                    );

                    return { value: wrapper.value, ageInSeconds };
                } catch (e) {
                    const parseError = e as Error;
                    this.logger.error(
                        `MGET: Failed to parse JSON for key ${formatMessage(key)} in mgetWithMetadata`,
                        parseError.message,
                    );
                    // Return undefined for individual parse failures
                    return undefined;
                }
            });
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `MGET: error in mgetWithMetadata: ${redisError.message}`,
            );
            // On a total network/Redis error, return an array of undefined matching input length
            return new Array(keys.length).fill(undefined) as (
                | { value: T; ageInSeconds: number }
                | undefined
            )[];
        }
    }
}
