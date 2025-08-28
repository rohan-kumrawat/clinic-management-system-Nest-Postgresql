import * as dotenv from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

dotenv.config();

// Local development ke liye configuration
const localConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'clinic_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'clinic_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Development mein true rakhein
  logging: true,
  dropSchema: process.env.NODE_ENV === 'development', // Development mein existing schema drop karega
};

// Production (Render.com) ke liye configuration
const productionConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Production mein false rakhein
  logging: false,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

// Environment detect karke configuration choose karein
export const databaseConfig = process.env.DATABASE_URL 
  ? productionConfig 
  : localConfig;