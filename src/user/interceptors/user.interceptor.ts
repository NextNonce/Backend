import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnauthorizedException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UserService } from '../user.service';
import { AuthUserDto } from '@/auth/dto/auth-user.dto';
import { Request } from 'express';
import { User } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { SKIP_USER_LOOKUP_KEY } from '@/user/decorators/skip-user-lookup.decorator';
import { AppLoggerService } from '@/app-logger/app-logger.service';
import { throwLogged } from '@/common/helpers/error.helper';

export interface RequestWithAuthUser extends Request {
    user?: AuthUserDto;
    fullUser?: User;
}

@Injectable()
export class UserInterceptor implements NestInterceptor {
    private readonly logger: AppLoggerService;
    constructor(
        private readonly userService: UserService,
        private readonly reflector: Reflector,
    ) {
        this.logger = new AppLoggerService(UserInterceptor.name);
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const skip = this.reflector.get<boolean>(
            SKIP_USER_LOOKUP_KEY,
            context.getHandler(),
        );
        //this.logger.log(`Skip user lookup: ${skip}`);
        if (skip) {
            return next.handle();
        }
        const request = context
            .switchToHttp()
            .getRequest<RequestWithAuthUser>();
        // This assumes that your AuthenticatedUser decorator (or JWT strategy) has already set request.user.
        const authUser: AuthUserDto | undefined = request.user;
        if (!authUser || !authUser.id) {
            this.logger.error('No auth user found in request');
            throwLogged(new UnauthorizedException('User not found'));
        }
        return from(this.userService.findByAuthUser(authUser)).pipe(
            switchMap((user: User) => {
                if (!user) {
                    this.logger.error('No user found in database');
                    throwLogged(new UnauthorizedException('User not found'));
                }
                // Attach the full user to the request.
                request.fullUser = user;
                return next.handle();
            }),
        );
    }
}
