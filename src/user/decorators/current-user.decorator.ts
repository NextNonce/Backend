// src/user/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';

export interface RequestWithUser extends Request {
    fullUser?: User;
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): User | undefined => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        return request.fullUser;
    },
);
