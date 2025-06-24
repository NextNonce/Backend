import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from '@/auth/interfaces/auth-provider.interface';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { CacheService } from '@/cache/cache.service';
import { NotFoundException } from '@nestjs/common';
import { mockCacheService } from '../../test/helpers/cache.mock';
import { CACHE_TTL_ONE_HOUR } from '@/cache/constants/cache.constants';

const mockAuthProvider = {
    getAuthUserByJwt: jest.fn(),
    getName: jest.fn().mockReturnValue('supabase'),
    deleteAuthUserById: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: AUTH_PROVIDER, useValue: mockAuthProvider },
                { provide: CacheService, useValue: mockCacheService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // --------------------------------------------------
    // Test for getAuthUserByToken
    // --------------------------------------------------
    describe('getAuthUserByToken', () => {
        it('should return cached auth user if available', async () => {
            const token = 'test-token';
            const cachedUser = new AuthUserDto();
            cachedUser.id = 'cached-id';

            // Simulate that the user is already cached
            mockCacheService.get.mockResolvedValue(cachedUser);

            const result = await service.getAuthUserByToken(token);

            expect(result).toEqual(cachedUser);
            expect(mockCacheService.get).toHaveBeenCalled();
            expect(mockAuthProvider.getAuthUserByJwt).not.toHaveBeenCalled();
        });

        it('should fetch auth user via provider if cache is empty and cache the result', async () => {
            const token = 'token';
            const fetchedUser = new AuthUserDto();
            fetchedUser.id = 'fetched-id';

            // Simulate a cache miss and then a successful provider lookup
            mockCacheService.get.mockResolvedValue(undefined);
            mockAuthProvider.getAuthUserByJwt.mockResolvedValue(fetchedUser);

            const result = await service.getAuthUserByToken(token);

            // The provider should be called with the token
            expect(mockAuthProvider.getAuthUserByJwt).toHaveBeenCalledWith(
                token,
            );
            // The user should be cached after retrieval
            expect(mockCacheService.set).toHaveBeenCalledWith(
                `mocked:auth-user:token:token`,
                fetchedUser.id,
                CACHE_TTL_ONE_HOUR,
            );
            expect(mockCacheService.set).toHaveBeenCalledWith(
                `mocked:auth-user:${fetchedUser.id}`,
                fetchedUser,
                CACHE_TTL_ONE_HOUR,
            );
            expect(result).toEqual(fetchedUser);
        });

        it('should throw NotFoundException if auth provider returns no user', async () => {
            const token = 'invalid-token';

            // Simulate cache miss and provider failing to return a user
            mockCacheService.get.mockResolvedValue(undefined);
            mockAuthProvider.getAuthUserByJwt.mockRejectedValue(
                new NotFoundException(),
            );

            await expect(service.getAuthUserByToken(token)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    // --------------------------------------------------
    // Test for createRecord
    // --------------------------------------------------
    describe('createRecord', () => {
        it('should call db.auth.findOrCreate with correct data', async () => {
            const authUser = new AuthUserDto();
            authUser.id = 'auth-user-id';
            const userId = 'user-id';

            // Create a dummy db object simulating Prisma's transaction client
            const mockDb = {
                auth: {
                    create: jest.fn().mockResolvedValue({
                        id: 'record-id',
                        provider: 'supabase',
                        userId,
                        providerUid: authUser.id,
                    }),
                },
            };

            const result = await service.createRecord(
                authUser,
                userId,
                mockDb as any,
            );

            // Verify that getName() was called on the provider and the findOrCreate method was called with proper data
            expect(mockAuthProvider.getName).toHaveBeenCalled();
            expect(mockDb.auth.create).toHaveBeenCalledWith({
                data: {
                    provider: 'supabase',
                    userId: userId,
                    providerUid: authUser.id,
                },
            });
            expect(result).toEqual({
                id: 'record-id',
                provider: 'supabase',
                userId,
                providerUid: authUser.id,
            });
        });
    });

    // --------------------------------------------------
    // Test for deleteAuthUser
    // --------------------------------------------------
    describe('deleteAuthUser', () => {
        it('should call authProvider.deleteAuthUserById with the correct id', async () => {
            const authUser = new AuthUserDto();
            authUser.id = 'auth-user-id';

            mockAuthProvider.deleteAuthUserById.mockResolvedValue(undefined);

            await service.deleteAuthUser(authUser);

            expect(mockAuthProvider.deleteAuthUserById).toHaveBeenCalledWith(
                authUser.id,
            );
        });
    });
});
