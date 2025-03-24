import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthProvider, AUTH_PROVIDER } from './interfaces/auth-provider.interface';
import { CacheService } from '@/cache/cache.service';
import { AuthUserDto} from '@/auth/dto/auth-user.dto';

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
        //const authUser = {id: '4', created_at: 'aa'} as AuthUser;
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
}
