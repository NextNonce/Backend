import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { mockConfigService } from '../../test/helpers/config.mock';
import { ConfigService } from '@nestjs/config';
import { BalanceService } from '@/balance/balance.service';
import { mockBalanceService } from '../../test/helpers/balance.mock';
import { mockAddressUtils, mockWalletTypeUtils } from '../../test/helpers/wallet.mock';
import { WalletTypeUtils } from '@/wallet/utils/wallet-type.utils';
import { AddressUtils } from '@/wallet/utils/address.utils';

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
                { provide: WalletTypeUtils, useValue:  mockWalletTypeUtils },
                { provide: AddressUtils, useValue:  mockAddressUtils }
            ],
        }).compile();

        service = module.get<WalletService>(WalletService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
