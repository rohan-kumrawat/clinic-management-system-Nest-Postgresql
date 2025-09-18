import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { PatientStatus, VisitType, PaymentStatus } from '../../common/enums';
import { Type } from 'class-transformer';

export class FilterPatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  doctorId?: number;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @IsEnum(VisitType)
  visit_type?: VisitType;

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