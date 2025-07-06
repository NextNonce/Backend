import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { TokenDto } from '@/token/dto/token.dto';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';

export function setupSwagger(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('NextNonce API')
        .setDescription('The NextNonce REST API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        extraModels: [TokenDto, UnifiedTokenDto],
    });

    SwaggerModule.setup('v1/docs', app, document);

    if (process.env.NODE_ENV === 'docs') {
        const outputPath = join(process.cwd(), 'static', 'openapi.json');
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, JSON.stringify(document, null, 2));
        process.exit(0); // quit immediately after exporting
    }
}
