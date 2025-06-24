import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { DatabaseService } from '@/database/database.service';
import { AuthService } from '@/auth/auth.service';
import { User } from '@prisma/client';
import { CacheService } from '@/cache/cache.service';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';
import { PortfolioService } from '@/portfolio/portfolio.service';
import { CreatePortfolioDto } from '@/portfolio/dto/create-portfolio.dto';
import { CACHE_TTL_ONE_HOUR } from '@/cache/constants/cache.constants';

@Injectable()
export class UserService {
    private readonly logger: AppLoggerService;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly authService: AuthService,
        private readonly portfolioService: PortfolioService,
    ) {
        this.logger = new AppLoggerService(UserService.name);
    }

    async create(
        createUserDto: CreateUserDto,
        authUser: AuthUserDto,
    ): Promise<User> {
        const user: User = await this.databaseService.$transaction(
            async (db) => {
                const newUser: User = await db.user.create({
                    data: createUserDto,
                });
                await this.authService.createRecord(authUser, newUser.id, db);
                const createPortfolioDto: CreatePortfolioDto = {
                    name: 'Portfolio',
                };
                await this.portfolioService.create(
                    newUser.id,
                    createPortfolioDto,
                    db,
                );
                return newUser;
            },
        );
        await this.cacheUser(user, authUser.id);
        return user;
    }

    async findByAuthUser(authUser: AuthUserDto): Promise<User> {
        const cachedUser: User | undefined =
            await this.getCachedUserByAuthUserId(authUser.id);
        if (cachedUser) {
            this.logger.log(
                `Getting cachedUser ${JSON.stringify(cachedUser)} with authUser ${JSON.stringify(authUser)}`,
            );
            return cachedUser;
        }
        this.logger.log(
            `Fetching user from DB with authUser ${JSON.stringify(authUser)}`,
        );
        const user: User | null = await this.databaseService.user.findFirst({
            where: {
                auth: {
                    providerUid: authUser.id,
                },
            },
        });
        if (!user) {
            this.logger.error(
                `User with authUser ${JSON.stringify(authUser)} does not exist`,
            );
            throwLogged(new NotFoundException('User not found'));
        }
        await this.cacheUser(user, authUser.id);
        return user;
    }

    // Update without validation
    async update(
        updateUserDto: UpdateUserDto,
        authUser: AuthUserDto,
    ): Promise<User> {
        const user: User = await this.findByAuthUser(authUser);
        const updatedUser: User = await this.databaseService.user.update({
            where: { id: user.id },
            data: updateUserDto,
        });
        await this.cacheUser(updatedUser, authUser.id);
        this.logger.log(
            `Updated user ${JSON.stringify(updatedUser)} with authUser ${JSON.stringify(authUser)}`,
        );
        return updatedUser;
    }

    async removeMe(authUser: AuthUserDto): Promise<User> {
        const user: User = await this.findByAuthUser(authUser);
        try {
            await this.databaseService.user.delete({ where: { id: user.id } }); // cascade delete
            await this.authService.deleteAuthUser(authUser); // delete user from auth provider
            await this.portfolioService.delCachedAll(user.id);
            await this.deleteCachedUserByAuthUserId(authUser.id);
        } catch (err) {
            this.logger.error(`Failed to delete user ${user.id}: ${err}`);
            throwLogged(
                new InternalServerErrorException('Failed to delete user'),
            );
        }
        return user;
    }

    private async cacheUser(user: User, authUserId: string) {
        // Canonical key for the full user object.
        const canonicalKey = this.cacheService.getCacheKey('user', user.id);

        // Pointer mapping key from authUser.id to user.id.
        const pointerKey = this.cacheService.getCacheKey('user:auth', {
            providerUid: authUserId,
        });

        await this.cacheService.set(pointerKey, user.id, CACHE_TTL_ONE_HOUR);
        await this.cacheService.set(canonicalKey, user, CACHE_TTL_ONE_HOUR);
    }

    private async getCachedUserByAuthUserId(
        authUserId: string,
    ): Promise<User | undefined> {
        const pointerKey = this.cacheService.getCacheKey('user:auth', {
            providerUid: authUserId,
        });
        const userId = await this.cacheService.get<string>(pointerKey);
        if (!userId) {
            return undefined;
        }
        const canonicalKey = this.cacheService.getCacheKey('user', userId);
        return await this.cacheService.get<User>(canonicalKey);
    }

    private async deleteCachedUserByAuthUserId(
        authUserId: string,
    ): Promise<void> {
        this.logger.log(`Deleting cache for authUserId: ${authUserId}`);
        const pointerKey = this.cacheService.getCacheKey('user:auth', {
            providerUid: authUserId,
        });

        // Step 1: Get the user ID from the pointer key
        const userId = await this.cacheService.get<string>(pointerKey);
        if (!userId) {
            // Nothing to delete
            return;
        }

        // Step 2: Build canonical key
        const canonicalKey = this.cacheService.getCacheKey('user', userId);

        // Step 3: Delete both entries
        await Promise.all([
            this.cacheService.del(pointerKey),
            this.cacheService.del(canonicalKey),
        ]);
    }
}
