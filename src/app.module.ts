import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CacheModule } from '@nestjs/cache-manager';

import { databaseConfig } from './config/database.config'; // Corrected import
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SessionsModule } from './sessions/sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // Database configuration with connection pooling
    TypeOrmModule.forRoot(databaseConfig),
    
    // Basic in-memory caching (Redis optional for production)
    CacheModule.register({
      ttl: parseInt(process.env.CACHE_TTL || '30000'), // 30 seconds default
      max: parseInt(process.env.CACHE_MAX_ITEMS || '100'), // Maximum cache items
      isGlobal: true,
    }),
    
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '3600s' },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        // Cache static assets for better performance
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
        setHeaders: (res, path) => {
          if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for images
          }
        },
      },
    }),
    AuthModule,
    PatientsModule,
    DoctorsModule,
    SessionsModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule {}





// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { PassportModule } from '@nestjs/passport';
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { join } from 'path';

// import { databaseConfig } from './config/database.config'; // Corrected import
// import { AuthModule } from './auth/auth.module';
// import { PatientsModule } from './patients/patients.module';
// import { DoctorsModule } from './doctors/doctors.module';
// import { SessionsModule } from './sessions/sessions.module';
// import { PaymentsModule } from './payments/payments.module';
// import { ReportsModule } from './reports/reports.module';

// @Module({
//   imports: [
//     TypeOrmModule.forRoot(databaseConfig), // Use databaseConfig directly
//     PassportModule,
//     JwtModule.register({
//       secret: process.env.JWT_SECRET || 'secretKey',
//       signOptions: { expiresIn: '3600s' },
//     }),
//     ServeStaticModule.forRoot({
//       rootPath: join(__dirname, '..', 'uploads'),
//       serveRoot: '/uploads',
//     }),
//     AuthModule,
//     PatientsModule,
//     DoctorsModule,
//     SessionsModule,
//     PaymentsModule,
//     ReportsModule,
//   ],
// })
// export class AppModule {}