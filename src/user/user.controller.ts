import { Controller, Get, Post, Body, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth, AuthenticatedUser } from '@/auth/decorators';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';

@Auth()
@Controller('users')
export class UserController {
    private readonly logger: AppLoggerService;
    constructor(private readonly userService: UserService) {
        this.logger = new AppLoggerService(UserController.name);
    }

    @Post()
    create(
        @AuthenticatedUser() authUser: AuthUserDto,
        @Body() createUserDto: CreateUserDto,
    ) {
        this.logger.log(
            `authUser ${JSON.stringify(authUser)} is creating a new user with ${JSON.stringify(createUserDto)}`,
        );
        return this.userService.create(createUserDto, authUser);
    }

    @Get('me')
    getMe(@AuthenticatedUser() authUser: AuthUserDto) {
        this.logger.log(
            `authUser ${JSON.stringify(authUser)} is getting their own User`,
        );
        return this.userService.findByAuthUser(authUser);
    }

    @Patch('me')
    updateMe(
        @AuthenticatedUser() authUser: AuthUserDto,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        this.logger.log(
            `User with authUser: ${JSON.stringify(authUser)} is updated with ${JSON.stringify(updateUserDto)}`,
        );
        return this.userService.update(updateUserDto, authUser);
    }

    @Delete('me')
    async removeMe(@AuthenticatedUser() authUser: AuthUserDto) {
        const deletedUser = await this.userService.removeMe(authUser);
        this.logger.log(`User ${JSON.stringify(deletedUser)} is deleted`);
        return { message: 'This user was fully deleted' };
    }
}
