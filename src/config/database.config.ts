import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Common configuration properties
const commonConfig: Partial<TypeOrmModuleOptions> = {
  type: 'postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // ✅ TEMPORARY TRUE FOR TABLE CREATION
  logging: true, // ✅ TRUE FOR DEBUGGING
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { 
      rejectUnauthorized: false 
    } : false,
  },
};

// Production configuration - DATABASE_URL ya individual variables se
const productionConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  ...(process.env.DATABASE_URL ? 
    { 
      url: process.env.DATABASE_URL 
    } : 
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
  ),
};

// Local development configuration
const localConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'clinic_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'clinic_management',
  dropSchema: process.env.NODE_ENV === 'development', // Only in development
};

// Environment detect karke configuration choose karein
export const databaseConfig = (process.env.NODE_ENV === 'production' || process.env.DB_HOST) 
  ? productionConfig 
  : localConfig;
