import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    app.enableCors(); // For now api is open to all origins (to everyone)
    app.setGlobalPrefix('v1');

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
