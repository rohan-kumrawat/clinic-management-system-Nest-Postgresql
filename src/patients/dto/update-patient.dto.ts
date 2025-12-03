import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender, PatientStatus } from '../../common/enums';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  
  @IsOptional()
  @IsString()
  reg_no?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}