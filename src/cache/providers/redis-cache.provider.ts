import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    InternalServerErrorException, // To signal critical startup failure
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { CacheProvider } from '../interfaces/cache-provider.interface';
import {
    AppLoggerService,
    formatMessage,
} from '@/app-logger/app-logger.service'; // Import logger
import { throwLogged } from '@/common/helpers/error.helper';
import { CacheMSetItem } from '@/cache/interfaces/cache-mset-item.interface';

// Helper interface for our new string-based storage model
interface CacheWrapper<T> {
    value: T;
    timestamp: number;
}

@Injectable()
export class RedisCacheProvider
    implements CacheProvider, OnModuleInit, OnModuleDestroy
{
    private redisClient: IORedis;
    private readonly logger: AppLoggerService;

    constructor(private configService: ConfigService) {
        this.logger = new AppLoggerService(RedisCacheProvider.name);
    }

    // Create and EAGERLY Connect client on init
    async onModuleInit() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password: string | undefined =
            this.configService.get<string>('REDIS_PASSWORD');

        this.logger.log(`Initializing Redis connection to ${host}:${port}`);

        this.redisClient = new IORedis({
            host: host,
            port: port,
            password: password,
            tls: {},
            // lazyConnect: false is default, no need to set
            connectionName: `myAppName-${process.pid}`, // Optional: Helps identify connections in Redis MONITOR
            connectTimeout: 5000, // Example: 10 second timeout for connection attempt
            maxRetriesPerRequest: 3, // Example: Don't retry commands indefinitely if connection drops
            retryStrategy: (times) => {
                // Example: Wait 50ms, 100ms, 200ms, ..., up to 2 seconds for reconnections
                const delay = Math.min(times * 50, 1000);
                this.logger.warn(
                    `Redis connection retry attempt ${times}, retrying in ${delay}ms`,
                );
                return delay;
            },
        });

        // Setup listeners before attempting connection explicitly
        this.redisClient.on('error', (err) => {
            // Log errors, especially useful for connection issues after initial connect
            this.logger.error(`Redis client error: ${err.message}`);
        });

        this.redisClient.on('connect', () => {
            this.logger.log('Redis client connected successfully.');
        });

        this.redisClient.on('reconnecting', () => {
            this.logger.warn('Redis client attempting to reconnect...');
        });

        this.redisClient.on('close', () => {
            // This might be logged during graceful shutdown too
            this.logger.warn('Redis client connection closed.');
        });

        // --- Eager Connection Verification ---
        try {
            // IORedis connects automatically, but we can 'ping' to ensure it's truly ready.
            // This will wait for the connection or throw if it fails within timeouts/retries.
            await this.redisClient.ping();
            this.logger.log(
                'Redis initial connection verified (ping successful).',
            );
        } catch (error) {
            if (error instanceof Error)
                this.logger.error(
                    `FATAL: Failed to establish initial Redis connection during startup - ${error.message}`,
                );
            // Attempt to clean up the client instance if partially created
            await this.redisClient.quit().catch((error) => {
                if (error instanceof Error)
                    this.logger.error(
                        `Error quitting Redis client after initial connection failure - ${error.message}`,
                    );
            });
            throwLogged(new InternalServerErrorException());
        }
        // ------------------------------------
    }

    // Destroy client on shutdown
    async onModuleDestroy() {
        if (this.redisClient && this.redisClient.status !== 'end') {
            this.logger.log(
                'Disconnecting Redis client via onModuleDestroy...',
            );
            await this.redisClient.quit(); // Graceful disconnect
            this.logger.log('Redis client disconnected.');
        } else {
            this.logger.log(
                'Redis client already disconnected or was not initialized.',
            );
        }
    }

    // --- Implementation of CacheProvider interface ---

    async get<T>(key: string): Promise<T | undefined> {
        try {
            const serializedData = await this.redisClient.get(key);
            if (serializedData === null) {
                this.logger.debug(`Cache MISS for key: ${formatMessage(key)}`);
                return undefined;
            }
            this.logger.debug(`Cache HIT for key: ${formatMessage(key)}`);
            try {
                const wrapper = JSON.parse(serializedData) as CacheWrapper<T>;
                return wrapper.value; // Return only the user's data
            } catch (error) {
                const parseError = error as Error;
                this.logger.error(
                    `Failed to parse JSON from Redis. Data: ${serializedData}, Error: ${parseError.message}, Key: ${formatMessage(key)}`,
                );
                return undefined;
            }
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis GET error ${redisError.message} for key ${formatMessage(key)}`,
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

            this.logger.debug(`Setting cache for key: ${formatMessage(key)}`);

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
                `Redis HSET/EXPIRE error ${redisError.message} for key ${formatMessage(key)}`,
            );
        }
    }

    async del(key: string): Promise<void> {
        try {
            this.logger.debug(`Deleting cache for key: ${formatMessage(key)}`);
            // .del returns the number of keys deleted, await it to ensure completion
            const keysDeleted = await this.redisClient.del(key);
            this.logger.debug(
                `Deleted ${keysDeleted} keys for key: ${formatMessage(key)}`,
            );
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis DEL error ${redisError.message} for key ${formatMessage(key)}`,
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
                    `Metadata MISS for key: ${formatMessage(key)}`,
                );
                return undefined;
            }

            const wrapper = JSON.parse(serializedData) as CacheWrapper<T>;
            const ageInSeconds = Math.round(
                (Date.now() - wrapper.timestamp) / 1000,
            );

            this.logger.debug(
                `Metadata HIT for key: ${formatMessage(key)}, Age: ${ageInSeconds}s`,
            );
            return { value: wrapper.value, ageInSeconds };
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis GET error ${redisError.message} for key ${formatMessage(key)}`,
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
            this.logger.debug(`Cache MGET for ${keys.length} keys.`);

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
                        `Failed to parse JSON for key ${keys[index]}`,
                        parseError.message,
                    );
                    return undefined;
                }
            });
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis MGET transaction error: ${redisError.message}`,
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
            this.logger.error(`Redis MSET error: ${redisError.message}`);
        }
    }
}
