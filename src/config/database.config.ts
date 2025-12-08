import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Common configuration properties
const commonConfig: Partial<TypeOrmModuleOptions> = {
  type: 'postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || false, // Production में false
  logging: process.env.DB_LOGGING === 'true' || false,
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  },
};

// Railway Production Configuration
const railwayConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

// Fallback for individual variables
const productionConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinic_management',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
  synchronize: true, // Local में true
  logging: true,
};

// Environment detection
export const databaseConfig: TypeOrmModuleOptions = (() => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('=== DATABASE CONFIG DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_SSL:', process.env.DB_SSL);
  
  // 1. Railway DATABASE_URL (Primary for Railway)
  if (process.env.DATABASE_URL && isProduction) {
    console.log('Using Railway DATABASE_URL configuration');
    return railwayConfig;
  }
  
  // 2. Production with individual variables
  if (isProduction) {
    console.log('Using production configuration with individual variables');
    return productionConfig;
  }
  
  // 3. Local development
  console.log('Using local development configuration');
  return localConfig;
})();


// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// // Common configuration properties
// const commonConfig: Partial<TypeOrmModuleOptions> = {
//   type: 'postgres',
//   entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//   synchronize: true, // ✅ TEMPORARY TRUE FOR TABLE CREATION
//   logging: true, // ✅ TRUE FOR DEBUGGING
//   extra: {
//     max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
//     idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
//     connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
//   },
// };

// // Production configuration
// const productionConfig: TypeOrmModuleOptions = {
//   ...commonConfig,
//   ...(process.env.DATABASE_URL ? 
//     { 
//       url: process.env.DATABASE_URL,
//       ssl: { rejectUnauthorized: false }
//     } : 
//     {
//       host: process.env.DB_HOST || 'localhost',
//       port: parseInt(process.env.DB_PORT || '5432', 10),
//       username: process.env.DB_USERNAME || 'postgres',
//       password: process.env.DB_PASSWORD || 'password',
//       database: process.env.DB_NAME || 'clinic_management',
//       ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//     }
//   ),
// };

// // Local development configuration
// const localConfig: TypeOrmModuleOptions = {
//   ...commonConfig,
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432', 10),
//   username: process.env.DB_USERNAME || 'clinic_user',
//   password: process.env.DB_PASSWORD || 'password',
//   database: process.env.DB_NAME || 'clinic_management',
//   ssl: false,
// };

// // ✅ Export the configuration object
// export const databaseConfig: TypeOrmModuleOptions = (process.env.NODE_ENV === 'production' || process.env.DB_HOST) 
//   ? productionConfig 
//   : localConfig;