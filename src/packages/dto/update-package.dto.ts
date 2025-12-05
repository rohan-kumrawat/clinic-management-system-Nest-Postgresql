import { PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto';
import { IsEnum, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { PackageStatus, VisitType } from 'src/common/enums';

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  used_sessions?: number;

  @IsOptional()
  @IsInt()
  assigned_doctor_id?: number;

  @IsOptional()
  @IsEnum(VisitType)
  visit_type?: VisitType;
}