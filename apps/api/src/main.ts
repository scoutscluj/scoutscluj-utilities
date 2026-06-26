import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

const DOCUMENT_UPLOAD_BODY_LIMIT = '25mb';

const getAllowedOrigins = (config: ConfigService) => {
  const configuredOrigins =
    config
      .get<string>('WEB_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  const singleOrigin = config.get<string>('WEB_ORIGIN');

  return Array.from(
    new Set([
      ...configuredOrigins,
      ...(singleOrigin ? [singleOrigin] : []),
      'http://localhost:5173',
      'http://localhost:5174',
    ]),
  );
};

const getPort = (config: ConfigService) => {
  const configuredPort =
    config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '3000';
  const port = Number(configuredPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid API port: ${configuredPort}`);
  }

  return port;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = getPort(config);

  app.use(json({ limit: DOCUMENT_UPLOAD_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: DOCUMENT_UPLOAD_BODY_LIMIT }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: getAllowedOrigins(config),
    credentials: true,
  });

  const documentConfig = new DocumentBuilder()
    .setTitle('Scouts Cluj Utilities API')
    .setDescription('Backend API for the Scouts Cluj utilities platform.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, documentConfig),
  );

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
