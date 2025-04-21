import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_PROVIDER } from '@/cache/interfaces/cache-provider.interface';
import { mockConfigService } from '../../test/helpers/config.mock';

describe('CacheService', () => {
    let service: CacheService;

    const mockCacheProvider = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                {
                    provide: CACHE_PROVIDER,
                    useValue: mockCacheProvider,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
