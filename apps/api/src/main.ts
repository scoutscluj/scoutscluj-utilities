import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT') ?? 3000;

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

  await app.listen(port);
}
void bootstrap();
