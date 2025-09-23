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

    // Serve static files for Swagger UI (fallback for Vercel)
    if (process.env.VERCEL) {
      app.use('/swagger-ui', (req: any, res: any, next: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        next();
      });
    }

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
          displayRequestDuration: true,
        },
        customCssUrl: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.css',
        ],
        customJs: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
        ],
        customSiteTitle: 'MAST HRM API Documentation',
        customfavIcon: 'https://nestjs.com/img/logo_text.svg',
        customCss: `
          .swagger-ui .topbar { 
            background-color: #2c3e50; 
          }
          .swagger-ui .topbar .download-url-wrapper { 
            display: none; 
          }
          .swagger-ui .info { 
            margin: 50px 0; 
          }
          .swagger-ui .info .title { 
            color: #2c3e50; 
          }
        `,
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
