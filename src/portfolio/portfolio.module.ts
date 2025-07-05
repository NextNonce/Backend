import { forwardRef, Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioWalletModule } from '@/portfolio-wallet/portfolio-wallet.module';
import { BalanceModule } from '@/balance/balance.module';

@Module({
    imports: [forwardRef(() => PortfolioWalletModule), BalanceModule],
    controllers: [PortfolioController],
    providers: [PortfolioService],
    exports: [PortfolioService],
})
export class PortfolioModule {}
