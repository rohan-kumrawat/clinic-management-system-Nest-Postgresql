import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { PaymentMode } from '../entity/payment.entity';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @IsNumber()
  amount_paid?: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;

  @IsOptional()
  remarks?: string;

  @IsOptional()
  @IsDateString()
  payment_date?: string;
}