import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSignatoryDto {
    @IsString()
    @IsNotEmpty()
    department: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class UpdateSignatoryDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    department?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    role?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    userId?: string;
}
