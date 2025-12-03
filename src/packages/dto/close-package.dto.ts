import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PackageStatus } from 'src/common/enums';

export class ClosePackageDto {
  @IsEnum(PackageStatus)
  status: PackageStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}