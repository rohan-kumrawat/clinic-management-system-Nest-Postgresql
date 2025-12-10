import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const common: Partial<DataSourceOptions> = {
  type: 'postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  logging: false,
};

let dataSourceOptions: DataSourceOptions;

if (process.env.DATABASE_URL) {
  dataSourceOptions = {
    ...common,
    // DATABASE_URL has highest priority
    url: process.env.DATABASE_URL,
    // SSL for hosted DBs. In prod, keep rejectUnauthorized false to avoid cert issues.
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
    synchronize: false,
  } as DataSourceOptions;
} else {
  dataSourceOptions = {
    ...common,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinic_management',
    synchronize: process.env.NODE_ENV !== 'production',
  } as DataSourceOptions;
}

export const AppDataSource = new DataSource(dataSourceOptions);

