import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';
import { IsEnum, IsOptional } from 'class-validator';
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
}