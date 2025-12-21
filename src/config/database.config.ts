import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export default async function databaseConfig(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const isProd = configService.get('NODE_ENV') === 'production';
  
  // Get DATABASE_URL from Railway
  let databaseUrl = configService.get<string>('DATABASE_URL');
  
  // Railway PostgreSQL me SSL required hota hai
  if (isProd && databaseUrl) {
    try {
      // Check if URL already has query parameters
      const hasQueryParams = databaseUrl.includes('?');
      
      // Ensure SSL mode is set for Railway
      if (!databaseUrl.includes('sslmode=')) {
        databaseUrl += hasQueryParams ? '&sslmode=require' : '?sslmode=require';
      }
      
      console.log('✅ Database URL configured for Railway');
    } catch (error) {
      console.error('Error configuring database URL:', error);
    }
  }

  return {
    type: 'postgres',
    url: databaseUrl,
    ssl: isProd ? { 
      rejectUnauthorized: false 
    } : false,
    autoLoadEntities: true,
    synchronize: false,
    logging: configService.get('DB_LOGGING') === 'true',
    
    // Railway ke liye optimized connection settings
    retryAttempts: 10, // Increase retry attempts
    retryDelay: 3000, // 3 seconds between retries
    connectTimeoutMS: 30000, // 30 seconds connection timeout
    
    // Connection pooling for Railway
    extra: {
      max: 20,
      connectionTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000,
    },
  };
}