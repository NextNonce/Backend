import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CACHE_PROVIDER,
    CacheProvider,
} from '@/cache/interfaces/cache-provider.interface';

@Injectable()
export class CacheService {
    private readonly prefix: string;
    private readonly version: string;
    constructor(
        @Inject(CACHE_PROVIDER)
        private readonly cacheProvider: CacheProvider,
        private readonly configService: ConfigService,
    ) {
        this.prefix = this.configService.get<string>('CACHE_PREFIX') || 'nn';
        this.version = this.configService.get<string>('CACHE_VERSION') || 'v1';
    }

    async get<T>(key: string): Promise<T | undefined> {
        return await this.cacheProvider.get<T>(key);
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        await this.cacheProvider.set(key, value, ttlSeconds);
    }

    async del(key: string): Promise<void> {
        await this.cacheProvider.del(key);
    }

    async getWithMetadata<T>(
        key: string,
    ): Promise<{ value: T; ageInSeconds: number } | undefined> {
        return await this.cacheProvider.getWithMetadata<T>(key);
    }

    // Overload: for a single identifier
    public getCacheKey(domain: string, id: string): string;

    // Overload: for a composite key from multiple fields
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
