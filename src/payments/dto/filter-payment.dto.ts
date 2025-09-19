import { IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { PaymentMode } from '../entity/payment.entity';
import { Type } from 'class-transformer';

export class FilterPaymentDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  patientId?: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}