import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { PatientStatus, PaymentStatus } from '../../common/enums';
import { Type } from 'class-transformer';

export class FilterPatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  reg_no?: string;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}