import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, Min, Max } from 'class-validator';
import { Gender, PatientStatus, VisitType } from '../../common/enums';

export class CreatePatientDto {

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

  
  @IsString()
  @IsNotEmpty()
  mobile: string;
  
  @IsOptional()
  @IsEmail()
  email?: string;
  
  @IsEnum(Gender)
  gender: Gender;
  
  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  referred_dr?: string;

  @IsOptional()
  @IsString()
  attachment?: string;

}