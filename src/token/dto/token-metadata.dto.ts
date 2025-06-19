import { TokenMetadata } from '@prisma/client';

export class TokenMetadataDto {
    symbol: string;
    name: string;
    decimals: number;
    logoUrl: string;
    description: string | null;
    createdAt: Date;
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
