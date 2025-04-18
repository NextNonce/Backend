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
import { PortfolioWalletModule } from '@/portfolio-wallet/portfolio-wallet.module';

@Module({
    imports: [
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
        PortfolioWalletModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
