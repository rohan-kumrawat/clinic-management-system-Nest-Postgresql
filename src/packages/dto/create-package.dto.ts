import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { PackageStatus } from 'src/common/enums';

export class CreatePackageDto {
  @IsOptional()
  @IsString()
  package_name: string;

  @IsOptional()
  @IsString()
  assigned_doctor_id: string;

  @IsNumber()
  @Min(0)
  original_amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @IsNumber()
  @Min(0)
  total_amount: number;

  @IsNumber()
  @Min(1)
  total_sessions: number;

  @IsNumber()
  @Min(0)
  per_session_amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  released_sessions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carry_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  used_sessions?: number;

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  start_date?: Date;

  @IsOptional()
  end_date?: Date;
}