import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(200)
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
