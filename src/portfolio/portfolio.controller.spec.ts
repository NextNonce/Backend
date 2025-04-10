import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { WalletService } from '@/wallet/wallet.service';
import { mockWalletService } from '../../test/helpers/wallet.mock';

describe('PortfolioController', () => {
    let controller: PortfolioController;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PortfolioController],
            providers: [
                PortfolioService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: WalletService, useValue: mockWalletService },
            ],
        }).compile();

        controller = module.get<PortfolioController>(PortfolioController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
