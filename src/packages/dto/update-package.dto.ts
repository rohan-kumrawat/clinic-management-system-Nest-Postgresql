import { PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto';
import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { PackageStatus } from 'src/common/enums';

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  used_sessions?: number;
}