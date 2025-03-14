import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';

@Module({
    imports: [AppLoggerModule, DatabaseModule, CacheModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
