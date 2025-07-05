import { Global, Module } from '@nestjs/common';
import { RedisClientService } from '@/common/redis/redis-client.service';

@Global()
@Module({
    providers: [RedisClientService],
    exports: [RedisClientService],
})
export class RedisModule {}
