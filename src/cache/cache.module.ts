import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { ConfigModule } from '@nestjs/config';
import { CACHE_PROVIDER } from '@/cache/interfaces/cache-provider.interface';
import { RedisCacheProvider } from '@/cache/providers/redis-cache.provider';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: CACHE_PROVIDER, // 👈 interface token
            useClass: RedisCacheProvider, // 👈 concrete implementation
        },
        CacheService,
    ],
    exports: [CacheService],
})
export class CacheModule {}
