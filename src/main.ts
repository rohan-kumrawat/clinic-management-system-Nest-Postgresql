import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isProduction, getDatabaseConfig } from './utils/environment.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Environment info log
  console.log(`Environment: ${isProduction() ? 'Production' : 'Development'}`);
  console.log(getDatabaseConfig());
  
  // Allowed origins - trailing slash remove karein
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://localhost:5173',
    'https://physiodash-hub.vercel.app', // ✅ Trailing slash remove kiya
    process.env.FRONTEND_URL, // Environment variable se
  ].filter(origin => origin && origin.trim() !== '');

  console.log('Allowed origins:', allowedOrigins);

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




// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { isProduction, getDatabaseConfig } from './utils/environment.util';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
  
//   // Environment info log
//   console.log(`Environment: ${isProduction() ? 'Production' : 'Development'}`);
//   console.log(getDatabaseConfig());
  
//    const allowedOrigins = [
//     'http://localhost:3000',
//     'http://localhost:3001', 
//     'http://localhost:8080',
//     'http://localhost:5173',
//     'https://physiodash-hub.vercel.app', // deployed frontend
//     process.env.FRONTEND_URL, // Environment variable se
//   ].filter(origin => origin);

//   // Enable CORS
//   app.enableCors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (like mobile apps, Postman)
//       if (!origin) return callback(null, true);
      
//       if (allowedOrigins.indexOf(origin) === -1) {
//         const msg = `CORS policy: ${origin} not allowed`;
//         return callback(new Error(msg), false);
//       }
//       return callback(null, true);
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//     credentials: true,
//     preflightContinue: false,
//     optionsSuccessStatus: 204
//   });
  
//   const port = process.env.PORT || 3000;
//   await app.listen(port);
//   console.log(`Application is running on: ${await app.getUrl()}`);
// }
// bootstrap();