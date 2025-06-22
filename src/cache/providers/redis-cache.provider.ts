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
    // No more connection checks needed here - assumes onModuleInit succeeded

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
                    `Setting cache with TTL: ${ttlInSeconds}s for key: ${formatMessage(key)}`,
                );
                await this.redisClient.setex(key, ttlInSeconds, stringValue);
            } else {
                this.logger.debug(
                    `Setting cache for key: ${formatMessage(key)} without TTL`,
                );
                await this.redisClient.set(key, stringValue);
            }

            // Execute both commands atomically
            await multi.exec();
        } catch (error) {
            const redisError = error as Error;
            this.logger.error(
                `Redis SET error ${redisError.message} for key ${formatMessage(key)}`,
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
}
