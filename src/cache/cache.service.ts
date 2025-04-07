import { Injectable, Inject } from '@nestjs/common';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
    private readonly prefix: string;
    private readonly version: string;
    constructor(
        @Inject('REDIS_CLIENT') private readonly redisClient: IORedis,
        private readonly configService: ConfigService,
    ) {
        this.prefix = this.configService.get<string>('CACHE_PREFIX') || 'nn';
        this.version = this.configService.get<string>('CACHE_VERSION') || 'v1';
    }

    async get<T>(key: string): Promise<T | undefined> {
        const data = await this.redisClient.get(key);
        return data ? (JSON.parse(data) as T) : undefined;
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        const stringValue = JSON.stringify(value);
        if (ttlSeconds) {
            await this.redisClient.set(key, stringValue, 'EX', ttlSeconds);
        } else {
            await this.redisClient.set(key, stringValue);
        }
    }

    async del(key: string): Promise<void> {
        await this.redisClient.del(key);
    }

    // Overload: for a single identifier
    public getCacheKey(domain: string, id: string): string;

    // Overload: for composite key from multiple fields
    public getCacheKey(domain: string, fields: Record<string, string>): string;

    public getCacheKey(
        domain: string,
        data: string | Record<string, string>,
    ): string {
        // Convert domain to kebab-case
        domain = this.toKebabCase(domain);
        if (typeof data === 'string') {
            return `${this.prefix}:${this.version}:${domain}:${this.sanitizeValue(data)}`;
        } else {
            // Sort keys for consistency
            const sortedKeys = Object.keys(data).sort();
            const fieldParts = sortedKeys.map(
                (key) => `${key}=${this.sanitizeValue(data[key])}`,
            );
            return `${this.prefix}:${this.version}:${domain}:${fieldParts.join(':')}`;
        }
    }

    private sanitizeValue(value: string): string {
        // Use URL encoding to handle problematic characters, e.g., colon.
        return encodeURIComponent(value);
    }

    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/_/g, '-')
            .toLowerCase();
    }
}
