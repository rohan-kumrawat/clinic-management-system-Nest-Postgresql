import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isProduction, getDatabaseConfig } from './utils/environment.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Environment info log
  console.log(`Environment: ${isProduction() ? 'Production' : 'Development'}`);
  console.log(getDatabaseConfig());
  
  // Enable CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'https://physiodash-hub.vercel.app/'
    ],
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();