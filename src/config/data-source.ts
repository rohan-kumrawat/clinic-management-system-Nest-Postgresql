import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { databaseConfig } from './database.config';

config();

// TypeORM CLI ke liye data source
const AppDataSource = new DataSource({
  type: "postgres",
  ...databaseConfig,
  migrations: [__dirname + '/../migrations/*.ts'],
  migrationsTableName: 'migrations',
  // Connection pooling settings
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    ssl: process.env.DATABASE_URL ? { 
      rejectUnauthorized: false 
    } : false,
  },
});

export default AppDataSource;







// import { DataSource } from 'typeorm';
// import { config } from 'dotenv';
// import { databaseConfig } from './database.config';

// config();

// // TypeORM CLI ke liye data source
// const AppDataSource = new DataSource({
//   type: "postgres",
//   ...databaseConfig,
//   migrations: [__dirname + '/../migrations/*.ts'],
//   migrationsTableName: 'migrations',
// });

// export default AppDataSource;