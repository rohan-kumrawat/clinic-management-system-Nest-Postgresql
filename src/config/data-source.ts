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
});

export default AppDataSource;