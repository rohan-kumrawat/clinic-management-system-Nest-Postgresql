import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// ✅ dotenv.config() hata diya kyunki main.ts mein already load ho chuka hai

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
  logging: true,
  dropSchema: process.env.NODE_ENV === 'development',
};

// Production (Render.com) ke liye configuration
const productionConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

// Environment detect karke configuration choose karein
export const databaseConfig = process.env.DATABASE_URL 
  ? productionConfig 
  : localConfig;