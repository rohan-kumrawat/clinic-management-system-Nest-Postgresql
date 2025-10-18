import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';
import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Gender, PatientStatus, VisitType } from '../../common/enums';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @IsEnum(VisitType)
  visit_type?: VisitType;

  @IsOptional()
  @IsString()
  reg_no?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  per_session_amount?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}