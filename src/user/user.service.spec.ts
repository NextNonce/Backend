import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { AuthService } from '@/auth/auth.service';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { mockAuthService } from '../../test/helpers/auth.mock';
import { mockPortfolioService } from '../../test/helpers/portfolio.mock';

describe('UserService', () => {
    let service: UserService;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: PortfolioService, useValue: mockPortfolioService },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
