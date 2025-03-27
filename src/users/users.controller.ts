import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth, AuthenticatedUser } from '@/auth/decorators';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthUserDto} from '@/auth/dto/auth-user.dto';

@Auth()
@Controller('users')
export class UsersController {
    private readonly logger: AppLoggerService;
    constructor(private readonly usersService: UsersService) {
        this.logger = new AppLoggerService(UsersController.name);
    }

    @Post()
    create(
        @AuthenticatedUser() authUser: AuthUserDto,
        @Body() createUserDto: CreateUserDto,
    ) {
        this.logger.log(
            `authUser ${JSON.stringify(authUser)} is creating a new user with ${JSON.stringify(createUserDto)}`,
        );
        return this.usersService.create(createUserDto, authUser);
    }

    @Get('me')
    getMe(@AuthenticatedUser() authUser: AuthUserDto) {
        this.logger.log(`authUser ${JSON.stringify(authUser)} is getting their own User`);
        return this.usersService.findByAuthUser(authUser);
    }

    @Patch('me')
    updateMe(@AuthenticatedUser() authUser: AuthUserDto, @Body() updateUserDto: UpdateUserDto) {
        this.logger.log(`User with authUser: ${JSON.stringify(authUser)} is updated with ${JSON.stringify(updateUserDto)}`);
        return this.usersService.update(updateUserDto, authUser);
    }

    @Delete('me')
    async removeMe(@AuthenticatedUser() authUser: AuthUserDto) {
        const deletedUser = await this.usersService.removeMe(authUser);
        this.logger.log(`User ${JSON.stringify(deletedUser)} is deleted`);
        return { message: 'This user was fully deleted' };
    }
}
