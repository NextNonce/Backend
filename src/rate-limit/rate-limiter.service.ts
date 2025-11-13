import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';

import { RedisClientService } from '@/common/redis/redis-client.service';

import {
    Queue,
    Worker,
    Job,
    QueueEvents,
    ConnectionOptions,
} from 'bullmq';
import Redis from 'ioredis';

export interface RateLimitQueueOptions {
    queueName: string;
    points: number;
    duration: number; // duration in seconds
}

type JobExecutor<T = any> = () => Promise<T>;

@Injectable()
export class RateLimiterService implements OnApplicationShutdown {
    private readonly logger: AppLoggerService;
    private redisClient: Redis;
    private queues = new Map<string, Queue>();
    private workers = new Map<string, Worker>();
    private events = new Map<string, QueueEvents>();
    private executors = new Map<string, JobExecutor>();

    constructor(
        //@Inject(RATE_LIMITER_PROVIDER)
        //private readonly rateLimiterProvider: RateLimiterProvider,
        private readonly redisClientService: RedisClientService,
    ) {
        this.logger = new AppLoggerService(RateLimiterService.name);
    }

    private async getClient(): Promise<Redis> {
        if (!this.redisClient) {
            // Re-use your existing redis client logic
            this.redisClient = await this.redisClientService.createClient(
                'bullmq-limiter',
                {
                    maxRetriesPerRequest: null,
                    enableOfflineQueue: false,
                },
            );
        }
        return this.redisClient;
    }

    /**
     * Registers a new classic rate-limited queue.
     */
    async registerRateLimitQueue(
        options: RateLimitQueueOptions,
    ): Promise<void> {
        if (this.workers.has(options.queueName)) {
            return;
        }

        this.logger.log(
            `Registering rate-limit worker for ${options.queueName}: ${options.points} points / ${options.duration}s`,
        );

        const connection = (await this.getClient()) as ConnectionOptions;

        const queue = new Queue(options.queueName, { connection });
        queue.setMaxListeners(0);

        const worker = new Worker(
            options.queueName,
            async (job: Job) => {
                const executor = this.executors.get(job.id!);
                if (!executor) {
                    throw new Error(`No executor found for job ${job.id}`);
                }
                try {
                    const result = await executor();
                    this.executors.delete(job.id!);
                    return result;
                } catch (error) {
                    this.executors.delete(job.id!);
                    throw error;
                }
            },
            {
                connection,
                concurrency: options.points,
                limiter: {
                    max: options.points,
                    duration: options.duration * 1000,
                },
            },
        );

        const queueEvents = new QueueEvents(options.queueName, { connection });
        queueEvents.setMaxListeners(0);

        this.queues.set(options.queueName, queue);
        this.workers.set(options.queueName, worker);
        this.events.set(options.queueName, queueEvents);
    }

    async execute<T>(queueName: string, jobFn: () => Promise<T>): Promise<T> {
        const queue = this.queues.get(queueName);
        const queueEvents = this.events.get(queueName);
        if (!queue || !queueEvents) {
            // Check for both
            throw new Error(
                `No queue or events registered with name ${queueName}`,
            );
        }

        const job = await queue.add(
            'execute-job',
            {},
            {
                removeOnComplete: true,
                removeOnFail: true,
            },
        );

        this.executors.set(job.id!, jobFn);

        try {
            const result = await job.waitUntilFinished(queueEvents);
            return result as T;
        } catch (error) {
            this.executors.delete(job.id!);
            this.logger.error(`Job in queue ${queueName} failed`, error);
            throw error;
        }
    }

    async onApplicationShutdown() {
        this.logger.log('Closing all BullMQ workers and queues...');
        for (const worker of this.workers.values()) {
            await worker.close();
        }
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        this.executors.clear();
    }
}
