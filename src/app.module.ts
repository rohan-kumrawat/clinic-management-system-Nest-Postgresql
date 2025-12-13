import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import databaseConfig from './config/database.config';

import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SessionsModule } from './sessions/sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import {CacheModule} from '@nestjs/cache-manager';
import { PackagesModule } from './packages/packages.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production'
        ? '.env.production'
        : '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
    }),

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('JWT_SECRET'),
        signOptions: { expiresIn: cs.get('JWT_EXPIRES_IN') },
      }),
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
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
})
export class AppModule {}
