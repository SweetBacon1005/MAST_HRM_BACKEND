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
        customSiteTitle: 'MAST HRM API Documentation',
        customCssUrl: 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css',
        customCss: `
          .swagger-ui .topbar { 
            background-color: #2c3e50 !important; 
            padding: 10px 0 !important;
          }
          .swagger-ui .topbar .download-url-wrapper { 
            display: none !important; 
          }
          .swagger-ui .info { 
            margin: 50px 0 !important; 
          }
          .swagger-ui .info .title { 
            color: #2c3e50 !important; 
            font-size: 2em !important;
          }
          .swagger-ui .info .description { 
            font-size: 1.1em !important;
            line-height: 1.6 !important;
          }
          .swagger-ui .scheme-container {
            background: #f8f9fa !important;
            border: 1px solid #e9ecef !important;
            border-radius: 4px !important;
            padding: 15px !important;
            margin: 20px 0 !important;
          }
          .swagger-ui .opblock .opblock-summary {
            border: 1px solid #e9ecef !important;
            border-radius: 4px !important;
          }
          .swagger-ui .opblock.opblock-post {
            border-color: #49cc90 !important;
            background: rgba(73, 204, 144, 0.1) !important;
          }
          .swagger-ui .opblock.opblock-get {
            border-color: #61affe !important;
            background: rgba(97, 175, 254, 0.1) !important;
          }
          .swagger-ui .opblock.opblock-put {
            border-color: #fca130 !important;
            background: rgba(252, 161, 48, 0.1) !important;
          }
          .swagger-ui .opblock.opblock-delete {
            border-color: #f93e3e !important;
            background: rgba(249, 62, 62, 0.1) !important;
          }
          .swagger-ui .opblock.opblock-patch {
            border-color: #50e3c2 !important;
            background: rgba(80, 227, 194, 0.1) !important;
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
