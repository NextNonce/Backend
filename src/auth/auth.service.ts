import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthProvider, AUTH_PROVIDER } from './interfaces/auth-provider.interface';
import { CacheService } from '@/cache/cache.service';
import { AuthUserDto} from '@/auth/dto/auth-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
    private readonly logger = new AppLoggerService(AuthService.name);

    constructor(
        @Inject(AUTH_PROVIDER)
        private readonly authProvider: AuthProvider,
        private readonly cacheService: CacheService,
    ) {}

    async getAuthUserByToken(token: string) {
        const cachedAuthUser: AuthUserDto | undefined =
            await this.cacheService.get(token); // Maybe make key more complex
        if (cachedAuthUser) {
            this.logger.log(
                `Getting cachedAuthUser ${JSON.stringify(cachedAuthUser)} with token ${token}`
            );
            return cachedAuthUser;
        }

        const authUser = await this.authProvider.getAuthUserByJwt(token);

        if (authUser) {
            this.logger.log(
                `Getting authUser ${JSON.stringify(authUser)}`,
            );
            await this.cacheService.set(token, authUser, 60 * 60);
        } else {
            this.logger.error(`Failed to get auth user by token: ${token}`);
            throw new UnauthorizedException('Invalid token');
        }
        return authUser;
    }

    async createRecord(db: Prisma.TransactionClient, authUser: AuthUserDto, userId: string) {
        return db.auths.create({
            data: {
                provider: this.authProvider.getName(),
                userId: userId,
                providerUid: authUser.id,
            },
        })
    }

    async deleteRecord(db: Prisma.TransactionClient, authUser: AuthUserDto) {
        return db.auths.delete({
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
