import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SessionsModule } from './sessions/sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
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
        maxAge: 2 * 60 * 60 * 1000,
        setHeaders: (res, path) => {
          if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
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