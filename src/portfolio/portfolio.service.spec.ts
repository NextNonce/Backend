import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { mockWalletService } from '../../test/helpers/wallet.mock';
import { WalletService } from '@/wallet/wallet.service';

describe('PortfolioService', () => {
    let service: PortfolioService;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: WalletService, useValue: mockWalletService },
            ],
        }).compile();

        service = module.get<PortfolioService>(PortfolioService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
