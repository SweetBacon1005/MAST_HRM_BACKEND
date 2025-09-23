import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';
import { envConfig } from './config/env.config';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

async function createApp() {
  if (!app) {
    app = await NestFactory.create(AppModule);

    const globalAuthGuard = app.get(GlobalAuthGuard);
    app.useGlobalGuards(globalAuthGuard);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // CORS
    app.enableCors();

    // Swagger Configuration - Enable in development and Vercel
    const enableSwagger = process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';
    if (enableSwagger) {
      const config = new DocumentBuilder()
        .setTitle('MAST HRM API')
        .setDescription('API documentation cho hệ thống MAST HRM')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User management endpoints')
        .addTag('Timesheet', 'Timesheet management endpoints')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
      
      console.log('Swagger documentation available at /api');
    } else {
      console.log('Swagger disabled - set ENABLE_SWAGGER=true to enable in production');
    }

    await app.init();
  }
  return app;
}

// For Vercel serverless deployment
export default async function handler(req: any, res: any) {
  const app = await createApp();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}

// For local development
async function bootstrap() {
  const app = await createApp();
  await app.listen(envConfig.app.port);
  console.log(
    `Application is running on: http://localhost:${envConfig.app.port}`,
  );
  console.log(
    `Swagger documentation: http://localhost:${envConfig.app.port}/api`,
  );
}

// Only run bootstrap in local development (not on Vercel)
if (require.main === module) {
  bootstrap();
}
