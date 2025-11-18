import { 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsDateString, 
  IsString, 
  IsObject, 
  ValidateNested,
  IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftType } from 'src/common/enums';

class PatientReferenceDto {
  @IsNumber()
  @IsNotEmpty()
  patient_id: number;
}

class DoctorReferenceDto {
  @IsOptional()
  @IsNumber()
  doctor_id?: number;
}

export class CreateSessionDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PatientReferenceDto)
  patient: PatientReferenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DoctorReferenceDto)
  doctor?: DoctorReferenceDto;

  @IsDateString()
  @IsNotEmpty()
  session_date: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;

  @IsOptional()
  @IsEnum(['clinic', 'home'])
  visit_type?: 'clinic' | 'home';

  @IsOptional()
  @IsNumber()
  package_id?: number;
}