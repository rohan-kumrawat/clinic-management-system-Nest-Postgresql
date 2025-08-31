import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isProduction, getDatabaseConfig } from './utils/environment.util';
import * as dotenv from 'dotenv';

// ✅ Pehle environment variables load karein - Yeh sabse important step hai
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('Loaded environment variables from .env file');
} else {
  console.log('Running in production mode, using system environment variables');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Debugging information - Environment variables check
  // console.log('=== Environment Variables Debug ===');
  // console.log('NODE_ENV:', process.env.NODE_ENV);
  // console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  // console.log('DB_HOST:', process.env.DB_HOST);
  // console.log('DB_HOST contains "dpg-":', process.env.DB_HOST?.includes('dpg-'));
  // console.log('DB_HOST contains "render":', process.env.DB_HOST?.includes('render'));
  // console.log('DB_NAME:', process.env.DB_NAME);
  // console.log('DB_USERNAME:', process.env.DB_USERNAME);
  // console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  // console.log('==================================');
  
  // Environment info log
  // console.log(`Environment: ${isProduction() ? 'Production' : 'Development'}`);
  // console.log(getDatabaseConfig());
  
  // Allowed origins - trailing slash remove karein
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://localhost:5173',
    'https://physiodash-hub.vercel.app', // deployed frontend
    process.env.FRONTEND_URL, // Environment variable se
  ].filter(origin => origin && origin.trim() !== '');

  // console.log('Allowed origins:', allowedOrigins);

  // Enable CORS with simpler configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
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