import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
    imports: [WalletModule],
    controllers: [PortfolioController],
    providers: [PortfolioService],
    exports: [PortfolioService],
})
export class PortfolioModule {}
