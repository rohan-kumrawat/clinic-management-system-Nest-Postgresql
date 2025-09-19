import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '../entity/payment.entity';

class PatientReferenceDto {
  @IsNumber()
  @IsNotEmpty()
  patient_id: number;
}

class SessionReferenceDto {
  @IsOptional()
  @IsNumber()
  session_id?: number;
}

class UserReferenceDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;
}

export class CreatePaymentDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PatientReferenceDto)
  patient: PatientReferenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionReferenceDto)
  session?: SessionReferenceDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UserReferenceDto)
  created_by: UserReferenceDto;

  @IsNumber()
  @IsNotEmpty()
  amount_paid: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;

  @IsOptional()
  remarks?: string;

  @IsDateString()
  @IsNotEmpty()
  payment_date: string;
}