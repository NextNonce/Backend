import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';

describe('WalletController', () => {
    let controller: WalletController;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [WalletController],
            providers: [
                WalletService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
            ],
        }).compile();

        controller = module.get<WalletController>(WalletController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
