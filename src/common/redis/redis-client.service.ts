import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    InternalServerErrorException,
} from '@nestjs/common';
import IORedis, { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleInit, OnModuleDestroy {
    private clients: IORedis[] = [];
    private client: IORedis;
    private readonly logger: AppLoggerService;

    constructor(private configService: ConfigService) {
        this.logger = new AppLoggerService(RedisClientService.name);
    }
    // Create and EAGERLY Connect client on init
    async onModuleInit() {
        this.logger.log('Initializing Redis client on module init...');
        if (!this.client || this.client.status === 'end') {
            this.client = await this.createClient('main');
        }
    }

    async createClient(
        name: string,
        overrides: Partial<RedisOptions> = {},
    ): Promise<Redis> {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password: string | undefined =
            this.configService.get<string>('REDIS_PASSWORD');

        this.logger.log(
            `Initializing Redis connection to ${host}:${port} with name "${name}" and overrides: ${JSON.stringify(overrides)}`,
        );

        const defaultOptions: RedisOptions = {
            host,
            port,
            password,
            tls: {},
            connectionName: `myAppName-${process.pid}-${name}`,
            connectTimeout: 5000,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 1000);
                this.logger.warn(
                    `Redis reconnect #${times}, retrying in ${delay}ms`,
                );
                return delay;
            },
        };

        const options = {
            ...defaultOptions,
            ...overrides,
        };

        const newClient = new IORedis(options);

        // Setup listeners before attempting connection explicitly
        newClient.on('error', (err) => {
            // Log errors, especially useful for connection issues after initial connecting
            this.logger.error(`Redis client error: ${err.message}`);
        });

        newClient.on('connect', () => {
            this.logger.log(`Redis client connected successfully.`);
        });

        newClient.on('reconnecting', () => {
            this.logger.warn('Redis client attempting to reconnect...');
        });

        newClient.on('close', () => {
            // This might be logged during graceful shutdown too
            this.logger.warn('Redis client connection closed.');
        });

        // --- Eager Connection Verification ---
        try {
            // IORedis connects automatically, but we can 'ping' to ensure it's truly ready.
            // This will wait for the connection or throw if it fails within timeouts/retries.
            if (options.enableOfflineQueue !== false) {
                await newClient.ping();
                this.logger.log(
                    'Redis initial connection verified (ping successful).',
                );
            }
        } catch (error) {
            if (error instanceof Error)
                this.logger.error(
                    `FATAL: Failed to establish initial Redis connection during startup - ${error.message}`,
                );
            // Attempt to clean up the client instance if partially created
            await this.client.quit().catch((error) => {
                if (error instanceof Error)
                    this.logger.error(
                        `Error quitting Redis client after initial connection failure - ${error.message}`,
                    );
            });
            throwLogged(new InternalServerErrorException());
        }
        // ------------------------------------
        this.clients.push(newClient);
        return newClient;
    }

    // Destroy client on shutdown
    async onModuleDestroy() {
        for (const client of this.clients) {
            if (client && client.status !== 'end') {
                this.logger.log(
                    `Disconnecting Redis client via onModuleDestroy...`,
                );
                await client.quit(); // Graceful disconnect
                this.logger.log('Redis client disconnected.');
            } else {
                this.logger.log(
                    'Redis client already disconnected or was not initialized.',
                );
            }
        }
    }

    getClient(): IORedis {
        return this.client;
    }
}
