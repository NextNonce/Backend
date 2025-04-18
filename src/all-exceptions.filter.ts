import {
    Catch,
    ArgumentsHost,
    HttpStatus,
    HttpException,
    HttpServer,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppLoggerService } from './app-logger/app-logger.service';
import {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

type MyResponseObj = {
    statusCode: number;
    timestamp: string;
    path: string;
    response: string | object;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
    private readonly logger: AppLoggerService;
    private readonly isDevelopment: boolean;
    constructor(
        private readonly configService: ConfigService,
        applicationRef?: HttpServer,
    ) {
        super(applicationRef);
        this.logger = new AppLoggerService(AllExceptionsFilter.name);
        this.isDevelopment =
            this.configService.get<string>('NODE_ENV') !== 'production';
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let responseMessage: string | object = 'Internal Server Error';

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            responseMessage = exception.getResponse();
        } else if (exception instanceof PrismaClientValidationError) {
            statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
            responseMessage = this.isDevelopment
                ? exception.message.replace(/\n/g, '')
                : 'Invalid request data';
        } else if (exception instanceof PrismaClientKnownRequestError) {
            this.logger.error(
                `Prisma error caught in exception filter, code: ${exception.code}, message: ${exception.message}`,
            );
            if (exception.code === 'P2002') {
                statusCode = HttpStatus.CONFLICT;
                responseMessage = 'Duplicate data not allowed'; // or a generic message
                (
                    exception as { suppressSuperCatch?: boolean }
                ).suppressSuperCatch = true;
            } else {
                statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
                responseMessage = 'Invalid request data';
            }
        }

        const myResponse: MyResponseObj = {
            statusCode: statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            response: responseMessage, // It could be dangerous to expose the actual error message to the client if it is not a "safe" error like HttpException
        };

        response.status(myResponse.statusCode).json(myResponse);

        if (!(exception as { alreadyLogged?: boolean }).alreadyLogged) {
            this.logger.error(
                typeof responseMessage === 'string'
                    ? responseMessage
                    : JSON.stringify(responseMessage),
                AllExceptionsFilter.name,
            );
        }
        if (
            !(exception as { suppressSuperCatch?: boolean }).suppressSuperCatch
        ) {
            super.catch(exception, host);
        }
    }
}
