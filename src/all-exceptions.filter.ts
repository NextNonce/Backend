import {
    Catch,
    ArgumentsHost,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppLoggerService } from './app-logger/app-logger.service';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';

type MyResponseObj = {
    statusCode: number;
    timestamp: string;
    path: string;
    response: string | object;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
    private readonly logger = new AppLoggerService(AllExceptionsFilter.name);

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
            responseMessage = exception.message.replace(/\n/g, '');
        }

        const myResponse: MyResponseObj = {
            statusCode: statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            response: responseMessage,
        };

        response.status(myResponse.statusCode).json(myResponse);

        this.logger.error(
            typeof responseMessage === 'string'
                ? responseMessage
                : JSON.stringify(responseMessage),
            AllExceptionsFilter.name,
        );
        super.catch(exception, host);
    }
}
