import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// TypeORM CLI ke liye data source
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'clinic_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'clinic_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*.ts'],
  migrationsTableName: 'migrations',
  //synchronize: process.env.NODE_ENV !== 'production', // DEVELOPMENT MEIN TRUE
  synchronize:true,
  logging: process.env.NODE_ENV === 'development',
  
  // Connection pooling settings
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    
    // SSL Configuration
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { 
      rejectUnauthorized: false 
    } : false,
  },
});

export default AppDataSource;

