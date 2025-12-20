import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
  });

  const port = process.env.PORT || 3000;

  // IMPORTANT: Railway requires 0.0.0.0
  await app.listen(port, '0.0.0.0');

  console.log(`Server running on 0.0.0.0 : ${port}`);
}

bootstrap();
