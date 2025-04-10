import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from '@/user/user.module';
import { PortfolioModule } from '@/portfolio/portfolio.module';
import { WalletModule } from './wallet/wallet.module';
import { ConfigModule } from '@nestjs/config';
//import { SentryModule } from '@sentry/nestjs/setup';
//import { DebugController } from './debug.controller';

@Module({
    imports: [
        //SentryModule.forRoot(),
        AppLoggerModule,
        DatabaseModule,
        CacheModule,
        AuthModule,
        UserModule,
        PortfolioModule,
        WalletModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
    ],
    controllers: [AppController /*DebugController*/],
    providers: [AppService],
    //exports: [AppService],
})
export class AppModule {}
