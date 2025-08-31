import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isProduction, getDatabaseConfig } from './utils/environment.util';
import * as dotenv from 'dotenv';

// ✅ Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Environment info log
  console.log(`Environment: ${isProduction() ? 'Production' : 'Development'}`);
  console.log(getDatabaseConfig());
  
  // Allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://localhost:5173',
    'https://physiodash-hub.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(origin => origin && origin.trim() !== '');

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.some(allowedOrigin => {
        return origin === allowedOrigin || 
               origin.startsWith(allowedOrigin + '/') ||
               (allowedOrigin === 'http://localhost:3000' && origin.startsWith('http://localhost:3000/'));
      })) {
        return callback(null, true);
      }
      
      const msg = `CORS policy: ${origin} not allowed`;
      console.warn(msg);
      return callback(new Error(msg), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();