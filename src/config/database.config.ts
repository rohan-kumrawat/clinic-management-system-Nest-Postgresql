import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export default async function databaseConfig(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const isProd = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    url: configService.get<string>('DATABASE_URL'),
    ssl: isProd ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
    logging: configService.get('DB_LOGGING') === 'true',
  };
}
