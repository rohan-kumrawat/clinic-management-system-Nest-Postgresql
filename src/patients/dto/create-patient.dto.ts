import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, Min, Max } from 'class-validator';
import { Gender, PatientStatus, VisitType } from '../../common/enums';

export class CreatePatientDto {
  @IsOptional()
  @IsNumber()
  serial_no?: number;

  @IsNotEmpty()
  @IsString()
  reg_no?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(150)
  age: number;

  @IsOptional()
  @IsString()
  referred_dr?: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  package_name: string;

  @IsOptional()
  @IsNumber()
  released_sessions?: number;

  @IsOptional()
  @IsNumber()
  carry_amount?: number;

  @IsNumber()
  @Min(0)
  original_amount: number;

  @IsNumber()
  @Min(0)
  discount_amount: number;

  @IsNumber()
  @Min(0)
  total_amount: number;

  @IsNumber()
  @Min(1)
  total_sessions: number;

  @IsOptional()
  @IsString()
  attachment?: string;

  @IsOptional()
  assigned_doctor?: any;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @IsEnum(VisitType)
  visit_type?: VisitType;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsNumber()
  @Min(0)
  per_session_amount?: number;
}