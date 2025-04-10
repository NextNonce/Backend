import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Delete,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth, AuthenticatedUser } from '@/auth/decorators';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { User } from '@prisma/client';
import { SkipUserLookup } from '@/user/decorators/skip-user-lookup.decorator';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserDto } from '@/user/dto/user.dto';

@ApiTags('users')
@Auth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('users')
export class UserController {
    private readonly logger: AppLoggerService;
    constructor(private readonly userService: UserService) {
        this.logger = new AppLoggerService(UserController.name);
    }

    @Post()
    @ApiOkResponse({
        description: 'User created successfully',
        type: UserDto,
    })
    @SkipUserLookup()
    async create(
        @AuthenticatedUser() authUser: AuthUserDto,
        @Body() createUserDto: CreateUserDto,
    ): Promise<UserDto> {
        const user: User = await this.userService.create(
            createUserDto,
            authUser,
        );
        this.logger.log(
            `authUser ${JSON.stringify(authUser)} is creating a new user with ${JSON.stringify(createUserDto)}`,
        );
        return UserDto.fromModel(user);
    }

    @Get('me')
    @ApiOkResponse({
        description: 'User found successfully',
        type: UserDto,
    })
    @SkipUserLookup()
    async getMe(@AuthenticatedUser() authUser: AuthUserDto): Promise<UserDto> {
        const user: User = await this.userService.findByAuthUser(authUser);
        this.logger.log(
            `authUser ${JSON.stringify(authUser)} is getting their own User`,
        );
        return UserDto.fromModel(user);
    }

    @Patch('me')
    @ApiOkResponse({
        description: 'User updated successfully',
        type: UserDto,
    })
    @SkipUserLookup()
    async updateMe(
        @AuthenticatedUser() authUser: AuthUserDto,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserDto> {
        const user: User = await this.userService.update(
            updateUserDto,
            authUser,
        );
        this.logger.log(
            `User with authUser: ${JSON.stringify(authUser)} is updated with ${JSON.stringify(updateUserDto)}`,
        );
        return UserDto.fromModel(user);
    }

    @Delete('me')
    @ApiOkResponse({
        description: 'User deleted successfully',
    })
    @SkipUserLookup()
    async removeMe(@AuthenticatedUser() authUser: AuthUserDto) {
        const deletedUser: User = await this.userService.removeMe(authUser);
        this.logger.log(`User ${JSON.stringify(deletedUser)} is deleted`);
        return { message: 'This user has been permanently deleted.' };
    }
}
