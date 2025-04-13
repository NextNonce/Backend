import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';
import { PortfolioAccess } from '@prisma/client';

export class CreatePortfolioDto {
    @ApiProperty({
        type: 'string',
        minLength: 1,
        maxLength: 24,
    })
    @IsNotEmpty()
    @IsString()
    @Length(1, 24)
    name: string;

    @ApiPropertyOptional({
        type: 'string',
        enum: PortfolioAccess,
        default: PortfolioAccess.PRIVATE,
    })
    @IsOptional()
    @IsEnum(PortfolioAccess)
    portfolioAccess?: PortfolioAccess;
}
