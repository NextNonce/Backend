import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    email?: string;
}
