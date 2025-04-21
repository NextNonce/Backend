import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioWalletController } from './portfolio-wallet.controller';
import { PortfolioWalletService } from './portfolio-wallet.service';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { WalletService } from '@/wallet/wallet.service';
import { mockWalletService } from '../../test/helpers/wallet.mock';
import { ConfigService } from '@nestjs/config';
import { mockConfigService } from '../../test/helpers/config.mock';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { mockPortfolioService } from '../../test/helpers/portfolio.mock';

describe('PortfolioWalletController', () => {
    let controller: PortfolioWalletController;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PortfolioWalletController],
            providers: [
                PortfolioWalletService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: WalletService, useValue: mockWalletService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: PortfolioService, useValue: mockPortfolioService },
            ],
        }).compile();

        controller = module.get<PortfolioWalletController>(
            PortfolioWalletController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
