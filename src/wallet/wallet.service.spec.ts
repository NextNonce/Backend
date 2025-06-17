import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { mockConfigService } from '../../test/helpers/config.mock';
import { ConfigService } from '@nestjs/config';

describe('WalletService', () => {
    let service: WalletService;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WalletService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<WalletService>(WalletService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
