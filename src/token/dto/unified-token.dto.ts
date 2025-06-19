import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';

export class UnifiedTokenDto {
    type: 'unified';
    tokens: TokenDto[];
    tokenMetadata: TokenMetadataDto;
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
