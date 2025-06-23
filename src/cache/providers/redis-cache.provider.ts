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
            const data = await this.redisClient.hget(key, 'data');
            if (data === null) {
                // Explicitly check for null (key not found)
                this.logger.debug(`Cache MISS for key: ${formatMessage(key)}`);
                return undefined;
            }
            this.logger.debug(`Cache HIT for key: ${formatMessage(key)}`);
            // Safely parse JSON
            try {
                return JSON.parse(data) as T;
            } catch (error) {
                const parseError = error as Error;
                this.logger.error(
                    `Failed to parse JSON from Redis. Data: ${data}, Error: ${parseError.message}, Key: ${formatMessage(key)}`,
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
            const stringValue = JSON.stringify(value);
            const multi = this.redisClient.multi();

            // 1. Set the data and timestamp fields in the hash.
            multi.hset(key, {
                data: stringValue,
                timestamp: Date.now(),
            });

            this.logger.debug(
                `Setting cache for key: ${formatMessage(key)} with timestamp`,
            );

            if (ttlInSeconds && ttlInSeconds > 0) {
                this.logger.debug(
                    `Applying TTL: ${ttlInSeconds}s for key: ${formatMessage(key)}`,
                );
                multi.expire(key, ttlInSeconds);
            }

            // Execute both commands atomically
            await multi.exec();
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
            // Use HGETALL to get all fields from the hash.
            const result = await this.redisClient.hgetall(key);

            // Check if the key exists and has our expected fields
            if (!result || !result.data || !result.timestamp) {
                this.logger.debug(
                    `Metadata MISS for key: ${formatMessage(key)}`,
                );
                return undefined;
            }

            const creationTimestamp = parseInt(result.timestamp, 10);
            const ageInSeconds = Math.round(
                (Date.now() - creationTimestamp) / 1000,
            );

            this.logger.debug(
                `Metadata HIT for key: ${formatMessage(key)}, Age: ${ageInSeconds}s`,
            );

            try {
                const value = JSON.parse(result.data) as T;
                return { value, ageInSeconds };
            } catch (error) {
                const parseError = error as Error;
                this.logger.error(
                    `Failed to parse JSON from Redis. Data: ${result.data}, Error: ${parseError.message}, Key: ${formatMessage(key)}`,
                );
                return undefined;
            }
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
            const multi = this.redisClient.multi();
            keys.forEach((key) => multi.hget(key, 'data'));

            // The raw result is an array of tuples, or null if the transaction failed.
            const rawResults = await multi.exec();

            // 1. Handle the case where the transaction itself fails completely.
            if (!rawResults) {
                this.logger.error('Redis MGET transaction failed to execute.');
                return new Array(keys.length).fill(undefined);
            }

            this.logger.debug(`Cache MGET for ${keys.length} keys.`);

            // 2. Process the array of tuples: [error, result]
            return rawResults.map(([error, data], index) => {
                // 3. Check for an error on each command.
                if (error) {
                    this.logger.error(
                        `Error fetching key ${keys[index]} in MGET batch:`,
                        error.message,
                    );
                    return undefined;
                }

                // 4. Safely check the result for the expected types.
                if (data === null) {
                    // This means the hash or field was not found (a cache miss)
                    return undefined;
                }

                if (typeof data === 'string') {
                    try {
                        // 5. Now we can safely parse the string.
                        return JSON.parse(data) as T;
                    } catch (e) {
                        this.logger.error(
                            `Failed to parse JSON for key ${keys[index]}`,
                            e,
                        );
                        return undefined;
                    }
                }

                // This case handles unexpected return types from Redis.
                this.logger.warn(
                    `Unexpected data type for key ${keys[index]} in MGET batch: ${typeof data}`,
                );
                return undefined;
            });
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis MGET transaction error: ${redisError.message}`,
            );
            // On a total failure, return an array of undefined matching the input length.
            return new Array(keys.length).fill(undefined);
        }
    }

    async mset<T>(items: CacheMSetItem<T>[]): Promise<void> {
        if (items.length === 0) {
            return;
        }
        try {
            const multi = this.redisClient.multi();
            const now = Date.now();

            // 1. Loop through all items and queue up the necessary commands.
            items.forEach((item) => {
                // a) Queue the HSET command with the data AND the current timestamp.
                multi.hset(item.key, {
                    data: JSON.stringify(item.value),
                    timestamp: now,
                });

                // b) If a TTL is provided, queue the EXPIRE command.
                if (item.ttlInSeconds && item.ttlInSeconds > 0) {
                    multi.expire(item.key, item.ttlInSeconds);
                }
            });

            // 2. Execute all queued commands atomically in a single network roundtrip.
            await multi.exec();

            this.logger.debug(`Cache MSET for ${items.length} items.`);
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(`Redis MSET error: ${redisError.message}`);
        }
    }
}
