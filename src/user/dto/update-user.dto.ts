//export class UpdateUserDto extends PartialType(CreateUserDto) {}
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    email?: string;
}
