import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.use(
    pinoHttp({
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = (typeof incoming === 'string' && incoming) || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
      },
    }),
  );
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('cors.origin'),
    credentials: true,
  });

  // Login/register protection against brute-force
  // More lenient for development, stricter for production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
      max: isDevelopment ? 100 : 10, // 100 requests dev, 10 requests prod
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many login attempts',
        message: isDevelopment
          ? 'Rate limit exceeded in development mode. Try again in 1 minute.'
          : 'Rate limit exceeded. Try again in 15 minutes.',
      },
    }),
  );
  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 min dev, 15 min prod
      max: isDevelopment ? 20 : 10, // 20 requests dev, 10 requests prod
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many registration attempts',
        message: isDevelopment
          ? 'Rate limit exceeded in development mode. Try again in 5 minutes.'
          : 'Rate limit exceeded. Try again in 15 minutes.',
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .filter(Boolean);
        return new BadRequestException(messages.join('; '));
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
