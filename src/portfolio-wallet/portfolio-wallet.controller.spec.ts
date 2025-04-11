import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioWalletController } from './portfolio-wallet.controller';
import { PortfolioWalletService } from './portfolio-wallet.service';

describe('PortfolioWalletController', () => {
    let controller: PortfolioWalletController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PortfolioWalletController],
            providers: [PortfolioWalletService],
        }).compile();

        controller = module.get<PortfolioWalletController>(
            PortfolioWalletController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
