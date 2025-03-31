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

@Injectable()
export class UserService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly authService: AuthService,
    ) {}

    async create(
        createUserDto: CreateUserDto,
        authUser: AuthUserDto,
    ): Promise<User> {
        return this.databaseService.$transaction(async (db) => {
            const newUser: User = await db.user.create({
                data: createUserDto,
            });
            await this.authService.createRecord(db, authUser, newUser.id);

            return newUser;
        });
    }

    async findByAuthUser(authUser: AuthUserDto): Promise<User> {
        const user: User | null = await this.databaseService.user.findFirst({
            where: {
                auth: {
                    providerUid: authUser.id,
                },
            },
        });
        if (!user) {
            throw new NotFoundException(
                `User with authUser ${JSON.stringify(authUser)} does not exist`,
            );
        }
        return user;
    }

    // Update without validation
    async update(
        updateUserDto: UpdateUserDto,
        authUser: AuthUserDto,
    ): Promise<User> {
        const user: User = await this.findByAuthUser(authUser);
        return this.databaseService.user.update({
            where: { id: user.id },
            data: updateUserDto,
        });
    }

    async removeMe(authUser: AuthUserDto): Promise<User> {
        const user: User = await this.findByAuthUser(authUser);
        try {
            // Step 1: Delete from DB inside a transaction
            await this.databaseService.$transaction(async (db) => {
                await this.authService.deleteRecord(db, authUser); // public.Auths
                await db.user.delete({ where: { id: user.id } }); // public.Users
            });

            // Step 2: Only if transaction succeeds, delete from Auth Provider
            await this.authService.deleteAuthUser(authUser);
        } catch (err) {
            throw new InternalServerErrorException(
                `Failed to delete user ${err}`,
            );
        }
        return user;
    }
}
