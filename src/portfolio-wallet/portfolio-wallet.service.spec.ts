import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioWalletService } from './portfolio-wallet.service';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { WalletService } from '@/wallet/wallet.service';
import { mockWalletService } from '../../test/helpers/wallet.mock';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { ConfigService } from '@nestjs/config';
import { mockConfigService } from '../../test/helpers/config.mock';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { mockPortfolioService } from '../../test/helpers/portfolio.mock';

describe('PortfolioWalletService', () => {
    let service: PortfolioWalletService;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioWalletService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: WalletService, useValue: mockWalletService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: PortfolioService, useValue: mockPortfolioService },
            ],
        }).compile();

        service = module.get<PortfolioWalletService>(PortfolioWalletService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
