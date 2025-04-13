import { forwardRef, Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioWalletModule } from '@/portfolio-wallet/portfolio-wallet.module';

@Module({
    imports: [forwardRef(() => PortfolioWalletModule)],
    controllers: [PortfolioController],
    providers: [PortfolioService],
    exports: [PortfolioService],
})
export class PortfolioModule {}
