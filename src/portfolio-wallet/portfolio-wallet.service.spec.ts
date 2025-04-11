import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioWalletService } from './portfolio-wallet.service';

describe('PortfolioWalletService', () => {
    let service: PortfolioWalletService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PortfolioWalletService],
        }).compile();

        service = module.get<PortfolioWalletService>(PortfolioWalletService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
