import { Injectable, Inject } from '@nestjs/common';
import {
    AppLoggerService,
    formatMessage,
} from '@/app-logger/app-logger.service';
import {
    AuthProvider,
    AUTH_PROVIDER,
} from './interfaces/auth-provider.interface';
import { CacheService } from '@/cache/cache.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { Prisma } from '@prisma/client';
import { CACHE_TTL_ONE_HOUR } from '@/cache/constants/cache.constants';

@Injectable()
export class AuthService {
    private readonly logger: AppLoggerService;

    constructor(
        @Inject(AUTH_PROVIDER)
        private readonly authProvider: AuthProvider,
        private readonly cacheService: CacheService,
    ) {
        this.logger = new AppLoggerService(AuthService.name);
    }

    async getAuthUserByToken(token: string) {
        const cachedAuthUser: AuthUserDto | undefined =
            await this.getCachedAuthUserByToken(token);
        if (cachedAuthUser) {
            this.logger.log(
                `Getting cachedAuthUser ${JSON.stringify(cachedAuthUser)} with token ${formatMessage(token)}`,
            );
            return cachedAuthUser;
        }

        const authUser = await this.authProvider.getAuthUserByJwt(token);
        this.logger.log(`Getting authUser ${JSON.stringify(authUser)}`);
        await this.cacheAuthUserByToken(authUser, token);

        return authUser;
    }

    async createRecord(
        authUser: AuthUserDto,
        userId: string,
        db: Prisma.TransactionClient,
    ) {
        return db.auth.create({
            data: {
                provider: this.authProvider.getName(),
                userId: userId,
                providerUid: authUser.id,
            },
        });
    }

    async deleteAuthUser(authUser: AuthUserDto) {
        await this.delCachedAuthUser(authUser);
        return this.authProvider.deleteAuthUserById(authUser.id);
    }

    private async cacheAuthUserByToken(authUser: AuthUserDto, token: string) {
        // Canonical key for the full authUser.
        const canonicalKey = this.cacheService.getCacheKey(
            'auth-user',
            authUser.id,
        );

        const pointerKey = this.cacheService.getCacheKey('auth-user:token', {
            token,
        });

        await this.cacheService.set(
            pointerKey,
            authUser.id,
            CACHE_TTL_ONE_HOUR,
        );
        await this.cacheService.set(canonicalKey, authUser, CACHE_TTL_ONE_HOUR);
    }

    private async getCachedAuthUserByToken(
        token: string,
    ): Promise<AuthUserDto | undefined> {
        const pointerKey = this.cacheService.getCacheKey('auth-user:token', {
            token,
        });
        const authUserId = await this.cacheService.get<string>(pointerKey);
        if (!authUserId) {
            return undefined;
        }
        const canonicalKey = this.cacheService.getCacheKey(
            'auth-user',
            authUserId,
        );
        return await this.cacheService.get<AuthUserDto>(canonicalKey);
    }

    private async delCachedAuthUser(authUser: AuthUserDto) {
        const canonicalKey = this.cacheService.getCacheKey(
            'auth-user',
            authUser.id,
        );
        await this.cacheService.del(canonicalKey);
    }
}
