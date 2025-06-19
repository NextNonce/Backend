//import './instrument';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { UserInterceptor } from '@/user/interceptors/user.interceptor';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@/app-logger/app-logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: false,
        bufferLogs: true,
    });
    app.useLogger(app.get(AppLoggerService));
    const configService = app.get(ConfigService);
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(configService, httpAdapter));
    app.useGlobalInterceptors(app.get(UserInterceptor));
    app.enableCors(); // For now api is open to all origins (to everyone)
    app.setGlobalPrefix('v1');

    await app.listen(configService.get<string>('PORT') ?? 3000);
}
bootstrap();
