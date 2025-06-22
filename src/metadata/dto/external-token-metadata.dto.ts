import { ApiProperty } from '@nestjs/swagger';
import { ADDRESS_MAX_LENGTH, ADDRESS_MIN_LENGTH } from '@/wallet/constants/address.constants';
import { IsInt, IsString } from 'class-validator';
import { DECIMALS_MAX, DECIMALS_MIN } from '@/token/constants/token.constants';

export class ExternalTokenMetadataDto {
    @ApiProperty({
        type: 'string',
        description: 'Name of the chain where the token is',
        example: 'ethereum',
    })
    @IsString()
    chainName: string; // NN chain name, not external chain name
    @ApiProperty({
        type: 'string',
        description: 'Unique identifier for the token on the chain',
        minLength: ADDRESS_MIN_LENGTH,
        maxLength: ADDRESS_MAX_LENGTH,
    })
    @IsString()
    address: string; // "native" for native tokens
    @ApiProperty({
        type: 'string',
        description: 'Symbol of the token, e.g., ETH, USDT',
        example: 'ETH',
    })
    @IsString()
    symbol: string | undefined;
    @ApiProperty({
        type: 'string',
        description: 'Name of the token, e.g., Ethereum',
        example: 'Ethereum',
    })
    @IsString()
    name: string | undefined;
    @ApiProperty({
        type: 'integer',
        description: 'Number of decimal places the token can be divided into',
        example: 18,
        minimum: DECIMALS_MIN,
        maximum: DECIMALS_MAX,
    })
    @IsInt()
    decimals: number | undefined;
    @ApiProperty({
        type: 'string',
        description: 'URL of the token logo',
        example: 'https://example.com/logo.png',
    })
    @IsString()
    logoUrl: string | undefined;

    constructor(init: Partial<ExternalTokenMetadataDto>) {
        Object.assign(this, init);
    }
}
