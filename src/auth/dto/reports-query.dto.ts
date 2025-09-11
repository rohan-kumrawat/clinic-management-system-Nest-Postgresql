import { IsOptional, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsIn(['patients', 'sessions', 'payments'])
  type?: 'patients' | 'sessions' | 'payments';
}