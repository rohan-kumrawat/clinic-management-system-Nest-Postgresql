import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'clinic-management-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
