import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import {
    AuthProvider,
    AUTH_PROVIDER,
} from './interfaces/auth-provider.interface';
import { CacheService } from '@/cache/cache.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { Prisma } from '@prisma/client';
import { throwLogged } from '@/common/helpers/error.helper';

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
        const cacheKey = this.cacheService.getCacheKey('auth-user', { token });
        this.logger.log(`Cache key for auth user: ${cacheKey}`);
        const cachedAuthUser: AuthUserDto | undefined =
            await this.cacheService.get(cacheKey); // Maybe make key more complex
        if (cachedAuthUser) {
            this.logger.log(
                `Getting cachedAuthUser ${JSON.stringify(cachedAuthUser)} with token ${token}`,
            );
            return cachedAuthUser;
        }

        const authUser = await this.authProvider.getAuthUserByJwt(token);

        if (authUser) {
            this.logger.log(`Getting authUser ${JSON.stringify(authUser)}`);
            await this.cacheService.set(cacheKey, authUser, 60 * 60);
        } else {
            this.logger.error(`Failed to get auth user by token: ${token}`);
            throwLogged(new UnauthorizedException('Invalid token'));
        }
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

    async deleteRecord(authUser: AuthUserDto, db: Prisma.TransactionClient) {
        return db.auth.delete({
            where: {
                provider: this.authProvider.getName(),
                providerUid: authUser.id,
            },
        });
    }

    async deleteAuthUser(authUser: AuthUserDto) {
        return this.authProvider.deleteAuthUserById(authUser.id);
    }
}
