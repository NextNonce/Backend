import { Portfolio, PortfolioAccess } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class PortfolioDto {
    @ApiProperty({
        type: 'string',
        format: 'uuid',
    })
    id: string;
    @ApiProperty({
        type: 'string',
        minLength: 1,
        maxLength: 24,
    })
    name: string;
    @ApiProperty({
        enum: PortfolioAccess,
        enumName: 'PortfolioAccess',
    })
    portfolioAccess: PortfolioAccess;
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

    static fromModel(portfolio: Portfolio): PortfolioDto {
        const dto = new PortfolioDto();
        dto.id = portfolio.id;
        dto.name = portfolio.name;
        dto.portfolioAccess = portfolio.portfolioAccess;
        dto.createdAt = portfolio.createdAt;
        dto.updatedAt = portfolio.updatedAt;
        return dto;
    }
}
