import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ClosePackageDto {
  @IsEnum(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  reason?: string;
}