
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  
  // Health check basic endpoint add karein
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Clinic Management System'
    });
  });

  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  logger.log(`📁 Health check available at: http://0.0.0.0:${port}/health`);
}

bootstrap();