import { TokenMetadataDto } from '@/token/dto/token-metadata.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { TokenPriceDto } from '@/token/dto/token-price.dto';
import { ApiProperty } from '@nestjs/swagger';
import { BalanceDto } from '@/balance/dto/balance.dto';
import { Type } from 'class-transformer';

export class UnifiedTokenDto {
    @ApiProperty({
        description: 'Discriminator for the unified token type.',
        enum: ['unified'], // Explicitly list the enum value
        example: 'unified',
    })
    type: 'unified';
    @ApiProperty({
        type: [TokenDto],
        description: 'List of tokens that are unified.',
        isArray: true,
    })
    @Type(() => TokenDto)
    tokens: TokenDto[];
    @ApiProperty({
        type: [BalanceDto],
        description: 'Balances of individual tokens across different chains.',
        isArray: true,
    })
    @Type(() => BalanceDto)
    balances: BalanceDto[];
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
        balances: BalanceDto[],
        tokenMetadata: TokenMetadataDto,
        tokenPrice: TokenPriceDto,
    ) {
        this.type = 'unified';
        this.tokens = tokens;
        this.balances = balances;
        this.tokenMetadata = tokenMetadata;
        this.tokenPrice = tokenPrice;
    }
}
