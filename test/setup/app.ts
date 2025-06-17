import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { App } from 'supertest/types';
import { authProvider } from './auth';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '@/all-exceptions.filter';
import { UserInterceptor } from '@/user/interceptors/user.interceptor';

export async function setupAppWithRegistration(): Promise<{
    app: INestApplication<App>;
    token: string;
    user: { email: string; password: string };
}> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app: INestApplication<App> = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(configService, httpAdapter));
    app.useGlobalInterceptors(app.get(UserInterceptor));
    app.enableCors();
    app.setGlobalPrefix('v1');
    await app.init();

    const { email, password, token } = await authProvider.registerTestUser();

    await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email })
        .expect(201);

    return { app, token, user: { email, password } };
}
