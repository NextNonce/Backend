import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { createMockDatabaseService } from '../../test/helpers/database.mock';
import { DatabaseService } from '@/database/database.service';
import { CacheService } from '@/cache/cache.service';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { AuthService } from '@/auth/auth.service';
import { mockAuthService } from '../../test/helpers/auth.mock';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { mockPortfolioService } from '../../test/helpers/portfolio.mock';

describe('UserController', () => {
    let controller: UserController;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = createMockDatabaseService();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                UserService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CacheService, useValue: mockCacheService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: PortfolioService, useValue: mockPortfolioService },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
