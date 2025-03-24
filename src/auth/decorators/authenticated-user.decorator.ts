// authenticated-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AppLoggerService} from '@/app-logger/app-logger.service';
import { AuthUserDto} from '@/auth/dto/auth-user.dto';

const logger = new AppLoggerService('AuthenticatedUser');

export const AuthenticatedUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request: Request = ctx.switchToHttp().getRequest();
        const user = request.user as AuthUserDto | undefined; // this was returned from JwtStrategy.validate()
        logger.log(`Got user: ${JSON.stringify(user)}`);
        if (!user) {
            throw new UnauthorizedException(
                'No authenticated user found in request',
            );
        }
        return user;
    },
);
