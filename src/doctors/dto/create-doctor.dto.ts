import { IsNotEmpty, IsOptional, IsBoolean, IsString, IsPhoneNumber, IsEmail } from 'class-validator';

export class CreateDoctorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  specialization: string;

  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean = true;
}