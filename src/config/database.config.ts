import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export default async function databaseConfig(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const isProd = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    url: configService.get<string>('DATABASE_URL'),
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: false,
    logging: true,
    retryAttempts: 0,
  //   retryDelay: 3000,
  //   connectTimeoutMS: 10000,
   };
}
