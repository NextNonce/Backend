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
import { BalanceModule } from './balance/balance.module';
import { TokenModule } from './token/token.module';
import { MetadataModule } from './metadata/metadata.module';
import { ChainModule } from './chain/chain.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
    imports: [
        AppLoggerModule,
        DatabaseModule,
        RedisModule,
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
        BalanceModule,
        TokenModule,
        MetadataModule,
        ChainModule,
        RateLimitModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
