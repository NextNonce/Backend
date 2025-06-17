import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PortfolioIdentifierDto {
    @ApiProperty({
        type: 'string',
        format: 'uuid',
    })
    @IsUUID()
    id: string;
}
