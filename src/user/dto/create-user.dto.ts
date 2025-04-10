import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {
    @ApiPropertyOptional({
        type: 'string',
        format: 'email',
    })
    @IsOptional()
    @IsEmail()
    email?: string;
}
