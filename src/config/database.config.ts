import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Local development ke liye configuration
const localConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'clinic_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'clinic_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  dropSchema: process.env.NODE_ENV === 'development',
  // Connection pooling settings
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    ssl: process.env.NODE_ENV === 'production' ? { 
      rejectUnauthorized: false 
    } : false,
  },
};

// Production (Render.com) ke liye configuration
const productionConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
  // Connection pooling settings for production
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: { 
      rejectUnauthorized: false 
    },
  },
};

// Environment detect karke configuration choose karein
export const databaseConfig = process.env.DATABASE_URL 
  ? productionConfig 
  : localConfig;

