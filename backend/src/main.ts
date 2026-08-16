import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not declared on the DTO
      forbidNonWhitelisted: true, // reject requests with unexpected fields instead of silently ignoring them
      transform: true, // let class-transformer coerce query/path strings into DTO types (e.g. pagination numbers)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Data Room API listening on http://localhost:${port}/api`);
}

bootstrap();
