import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UnifiedTokenDto {
    @ApiProperty({
        description: 'Discriminator for the single token type.',
        enum: ['single'], // Explicitly list the enum value
        example: 'single',
    })
    type: 'unified';
    @ApiProperty({
        type: [TokenDto],
        description: 'List of tokens that are unified.',
    })
    tokens: TokenDto[];
    @ApiProperty({
        type: TokenMetadataDto,
        description: 'Metadata of the unified token.',
    })
    tokenMetadata: TokenMetadataDto;
    @ApiProperty({
        type: TokenPriceDto,
        description: 'Price information for the unified token.',
    })
    tokenPrice: TokenPriceDto;

    constructor(
        tokens: TokenDto[],
        tokenMetadata: TokenMetadataDto,
        tokenPrice: TokenPriceDto,
    ) {
        this.tokens = tokens;
        this.tokenMetadata = tokenMetadata;
        this.tokenPrice = tokenPrice;
    }
}
