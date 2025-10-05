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

    // CORS Configuration - Allow all origins
    app.enableCors({
      origin: true, // Allow all origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 86400, // 24 hours
    });

    // Vercel-specific optimizations
    if (process.env.VERCEL) {
      // Add security headers
      app.use((req: any, res: any, next: any) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
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
      
      // Optimized setup for Vercel
      const swaggerConfig = {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          tryItOutEnabled: true,
          filter: true,
          docExpansion: 'none',
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
        },
        customSiteTitle: 'MAST HRM API Documentation',
        customfavIcon: '/favicon.ico',
        customJs: [
          // Use multiple CDNs for reliability
          'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js',
          'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js',
        ],
        customCssUrl: [
          // Multiple CSS sources for fallback
          'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css',
          'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css',
        ],
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
          .swagger-ui .scheme-container {
            background: #f8f9fa !important;
            border: 1px solid #e9ecef !important;
            border-radius: 4px !important;
            padding: 15px !important;
            margin: 20px 0 !important;
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
          
          /* Vercel-specific optimizations */
          .swagger-ui .loading-container {
            padding: 40px 0 !important;
          }
          .swagger-ui .info .title small {
            background: #7d8492 !important;
          }
          .swagger-ui .opblock .opblock-summary-description {
            font-size: 13px !important;
            color: #3b4151 !important;
          }
        `,
      };
      
      SwaggerModule.setup('api', app, document, swaggerConfig);
      
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
