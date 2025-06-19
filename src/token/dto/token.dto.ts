import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';
import { Chain, Token } from '@prisma/client';

export class TokenDto {
    type: 'single';
    address: string | null;
    chainName: string;
    tokenMetadata: TokenMetadataDto;
    tokenPrice: TokenPriceDto;

    constructor(
        token: Token,
        chain: Chain,
        tokenMetadata: TokenMetadataDto,
        tokenPrice: TokenPriceDto,
    ) {
        this.address = token.address;
        this.chainName = chain.name;
        this.tokenMetadata = tokenMetadata;
        this.tokenPrice = tokenPrice;
    }
}
