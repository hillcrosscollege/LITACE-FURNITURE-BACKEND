import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RolesGuard } from './core/common/gaurds/role.gaurd';
import { JwtAuthGuard } from './core/common/gaurds/jwt_auth.gaurd';
import { HttpExceptionFilter } from './core/common/filters/httpExceptionFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);

  // ─── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  });

  // ─── Global pipes ──────────────────────────────────────────────────────────\
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global guards ─────────────────────────────────────────────────────────
  // JwtAuthGuard runs first — skips routes marked @Public()
  // RolesGuard runs after — checks @Roles() decorator on protected routes
  // app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // ─── Global filters ────────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Swagger ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Litace API')
      .setDescription('Litace furniture e-commerce REST API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        'access-token', // ← reference name used in @ApiBearerAuth('access-token')
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // keeps token across page refreshes
      },
    });

    console.log(
      `📄 Swagger docs: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
    );
  }

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Litace API running on http://localhost:${port}/api/v1`);
}

bootstrap();
