import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto } from './create-session.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @IsOptional()
  @IsNumber()
  package_id?: number;
}