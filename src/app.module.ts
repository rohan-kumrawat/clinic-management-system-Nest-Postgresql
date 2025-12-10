import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SessionsModule } from './sessions/sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { CacheModule } from '@nestjs/cache-manager';
import { SeedService } from './seed/seed.service';
import { User } from './auth/entity/user.entity';
import { PackagesModule } from './packages/packages.module';
import { HealthModule } from './health/health.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User]),
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
    PackagesModule,
    HealthModule,
  ],
  providers: [SeedService],
})
export class AppModule {}