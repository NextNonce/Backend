import { forwardRef, Module } from '@nestjs/common';
import { PortfolioWalletService } from './portfolio-wallet.service';
import { PortfolioWalletController } from './portfolio-wallet.controller';
import { PortfolioModule } from '@/portfolio/portfolio.module';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
    imports: [forwardRef(() => PortfolioModule), WalletModule],
    controllers: [PortfolioWalletController],
    providers: [PortfolioWalletService],
    exports: [PortfolioWalletService],
})
export class PortfolioWalletModule {}
