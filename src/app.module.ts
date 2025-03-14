import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { DatabaseModule } from './database/database.module';

@Module({
    imports: [AppLoggerModule, DatabaseModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
