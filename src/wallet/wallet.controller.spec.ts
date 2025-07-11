import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { mockConfigService } from '../../test/helpers/config.mock';
import { ConfigService } from '@nestjs/config';
import { BalanceService } from '@/balance/balance.service';
import { mockBalanceService } from '../../test/helpers/balance.mock';
import { WalletTypeUtils } from '@/wallet/utils/wallet-type.utils';
import { mockAddressUtils, mockWalletTypeUtils } from '../../test/helpers/wallet.mock';
import { AddressUtils } from '@/wallet/utils/address.utils';

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
                { provide: ConfigService, useValue: mockConfigService },
                { provide: BalanceService, useValue: mockBalanceService },
                { provide: WalletTypeUtils, useValue:  mockWalletTypeUtils },
                { provide: AddressUtils, useValue:  mockAddressUtils }
            ],
        }).compile();

        controller = module.get<WalletController>(WalletController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
