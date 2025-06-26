import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
    @ApiProperty({
        description: 'Discriminator for the single token type.',
        enum: ['single'], // Explicitly list the enum value
        example: 'single',
    })
    type: 'single';
    @ApiProperty({
        type: 'string',
        description:
            'The name of the blockchain network this token belongs to.',
    })
    chainName: string;
    @ApiProperty({
        type: 'string',
        description: 'Unique identifier for the token on the chain',
    })
    address: string; // "native" for native tokens
    @ApiProperty({
        type: TokenMetadataDto,
        description:
            'Metadata of the token, including symbol, name, decimals, etc.',
    })
    tokenMetadata: TokenMetadataDto;
    @ApiProperty({
        type: TokenPriceDto,
        description: 'Current price of the token in USD.',
    })
    tokenPrice: TokenPriceDto;

    constructor(
        chainName: string,
        tokenAddress: string,
        tokenMetadata: TokenMetadataDto,
        tokenPrice: TokenPriceDto,
    ) {
        this.type = 'single';
        this.chainName = chainName;
        this.address = tokenAddress;
        this.tokenMetadata = tokenMetadata;
        this.tokenPrice = tokenPrice;
    }
}
