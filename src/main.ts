import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import compression from 'compression';

// ✅ Load .env file
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
  }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Environment info
  console.log('=== APPLICATION STARTUP ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  
  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://localhost:5173',
    'https://physiodash-hub.vercel.app',
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN === '*' ? ['*'] : [process.env.CORS_ORIGIN]).filter(Boolean)
  ];

  app.enableCors({
    origin: function (origin, callback) {
      // Railway पर health checks के लिए allow
      if (!origin) {
        return callback(null, true);
      }
      
      if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  
  // Railway port binding - 0.0.0.0 is important
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`✅ Application is running on: http://0.0.0.0:${port}`);
  console.log(`🌍 Health check: http://0.0.0.0:${port}/health`);
  console.log('🚀 Compression middleware enabled');
}

bootstrap();