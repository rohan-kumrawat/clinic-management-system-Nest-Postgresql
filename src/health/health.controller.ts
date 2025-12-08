// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async checkHealth() {
    try {
      // Database connection test
      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV,
        port: process.env.PORT,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
        environment: process.env.NODE_ENV,
        port: process.env.PORT,
      };
    }
  }
}