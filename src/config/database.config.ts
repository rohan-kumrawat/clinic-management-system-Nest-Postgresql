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
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'), // Maximum connections in pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle connections after 30s
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Return error if connection not established in 2s
    // SSL configuration
    ssl: process.env.NODE_ENV === 'production' ? { 
      rejectUnauthorized: false 
    } : false,
  },
  // Performance optimizations
  cache: {
    type: "redis",
    options: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
    duration: parseInt(process.env.DB_CACHE_DURATION || "30000"), // 30 seconds cache
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
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Return error if connection not established in 2s
    ssl: { 
      rejectUnauthorized: false 
    },
  },
  // Performance optimizations
  cache: {
    type: "redis",
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
    },
    duration: 30000, // 30 seconds cache
  },
};

// Environment detect karke configuration choose karein
export const databaseConfig = process.env.DATABASE_URL 
  ? productionConfig 
  : localConfig;






// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// // ✅ dotenv.config() hata diya kyunki main.ts mein already load ho chuka hai

// // Local development ke liye configuration
// const localConfig: TypeOrmModuleOptions = {
//   type: 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432', 10),
//   username: process.env.DB_USERNAME || 'clinic_user',
//   password: process.env.DB_PASSWORD || 'password',
//   database: process.env.DB_NAME || 'clinic_management',
//   entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//   synchronize: true,
//   logging: true,
//   dropSchema: process.env.NODE_ENV === 'development',
// };

// // Production (Render.com) ke liye configuration
// const productionConfig: TypeOrmModuleOptions = {
//   type: 'postgres',
//   url: process.env.DATABASE_URL,
//   entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//   synchronize: false,
//   logging: false,
//   ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
// };

// // Environment detect karke configuration choose karein
// export const databaseConfig = process.env.DATABASE_URL 
//   ? productionConfig 
//   : localConfig;