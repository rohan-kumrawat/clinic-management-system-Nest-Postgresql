
// database.config.ts - IMPROVED VERSION
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export default async function databaseConfig(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const isProd = configService.get('NODE_ENV') === 'production';
  
  // Railway me DATABASE_URL milti hai
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  // DATABASE_URL ko parse karke TypeORM ke format me convert karna
  let sslConfig: any = false;
  
  if (isProd && databaseUrl) {
    // Railway PostgreSQL always requires SSL in production
    sslConfig = { 
      rejectUnauthorized: false 
    };
    
    // Database URL me ?ssl=true add karna agar nahi hai
    if (!databaseUrl.includes('ssl=true') && !databaseUrl.includes('sslmode=')) {
      console.log('⚠️ Adding SSL params to database URL');
    }
  }

  return {
    type: 'postgres',
    url: databaseUrl,
    ssl: sslConfig,
    autoLoadEntities: true,
    synchronize: false, // Production me kabhi true mat rakhein
    logging: configService.get('DB_LOGGING') === 'true',
    retryAttempts: 5,
    retryDelay: 5000,
    connectTimeoutMS: 15000,
    extra: {
      // Connection pooling for better performance
      max: 20,
      connectionTimeoutMillis: 15000,
    },
  };
}