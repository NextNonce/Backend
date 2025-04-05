// authenticated-current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { throwLogged } from '@/common/helpers/error.helper';

const logger = new AppLoggerService('AuthenticatedUser');

export const AuthenticatedUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request: Request = ctx.switchToHttp().getRequest();
        const authUser = request.user as AuthUserDto | undefined; // this was returned from JwtStrategy.validate()

        if (!authUser) {
            logger.error('No authenticated user found in request');
            throwLogged(new UnauthorizedException('User not found'));
        }
        logger.log(`Got user: ${JSON.stringify(authUser)}`);
        return authUser;
    },
);
