import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserDto {
    @ApiProperty({
        type: 'string',
        format: 'email',
        nullable: true,
    })
    email: string | null;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
    })
    createdAt: Date;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
    })
    updatedAt: Date;

    static fromModel(user: User): UserDto {
        const dto = new UserDto();
        dto.email = user.email;
        dto.createdAt = user.createdAt;
        dto.updatedAt = user.updatedAt;
        return dto;
    }
}
