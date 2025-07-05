import { TokenMetadata } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { DECIMALS_MAX, DECIMALS_MIN } from '@/token/constants/token.constants';

export class TokenMetadataDto {
    @ApiProperty({
        type: 'string',
        description: 'Symbol of the token, e.g., ETH, USDT',
        example: 'ETH',
    })
    symbol: string;
    @ApiProperty({
        type: 'string',
        description: 'Name of the token, e.g., Ethereum',
        example: 'Ethereum',
    })
    name: string;
    @ApiProperty({
        type: 'integer',
        description: 'Number of decimal places the token can be divided into',
        example: 18,
        minimum: DECIMALS_MIN,
        maximum: DECIMALS_MAX,
    })
    decimals: number;
    @ApiProperty({
        type: 'string',
        description: 'URL of the token logo',
        example: 'https://example.com/logo.png',
    })
    logoUrl: string | null;
    @ApiProperty({
        type: 'string',
        description: 'Description of the token',
        nullable: true,
    })
    description: string | null;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
        description: 'The timestamp when the token metadata was created',
        example: '2024-12-01T12:00:00Z',
    })
    createdAt: Date;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
        description: 'The timestamp when the token metadata was last updated',
        example: '2024-12-01T12:00:00Z',
    })
    updatedAt: Date;

    static fromModel(tokenMetadata: TokenMetadata): TokenMetadataDto {
        const dto = new TokenMetadataDto();
        dto.symbol = tokenMetadata.symbol;
        dto.name = tokenMetadata.name;
        dto.decimals = tokenMetadata.decimals;
        dto.logoUrl = tokenMetadata.logo;
        dto.description = tokenMetadata.description;
        dto.createdAt = tokenMetadata.createdAt;
        dto.updatedAt = tokenMetadata.updatedAt;
        return dto;
    }
}
