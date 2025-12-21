import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting Clinic Management System...');
    
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    const port = process.env.PORT || 3000;
    
    // Simple health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Clinic Management System',
        uptime: process.uptime(),
      });
    });

    await app.listen(port, '0.0.0.0');
    
    logger.log(`✅ Application started successfully on port ${port}`);
    logger.log(`🌐 Health endpoint: http://0.0.0.0:${port}/health`);
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();