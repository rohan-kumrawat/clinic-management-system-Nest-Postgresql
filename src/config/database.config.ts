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
  },
};

// Production configuration
const productionConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  ...(process.env.DATABASE_URL ? 
    { 
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    } : 
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'clinic_management',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
  ssl: false,
};

// ✅ Export the configuration object
export const databaseConfig: TypeOrmModuleOptions = (process.env.NODE_ENV === 'production' || process.env.DB_HOST) 
  ? productionConfig 
  : localConfig;