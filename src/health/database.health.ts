import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');
      
      return this.getStatus(key, true, {
        type: 'postgresql',
        status: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError(
        'Database connection failed',
        this.getStatus(key, false, {
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
}