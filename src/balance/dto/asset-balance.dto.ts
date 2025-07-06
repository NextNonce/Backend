import { TokenDto } from '@/token/dto/token.dto';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';
import { BalanceDto } from '@/balance/dto/balance.dto';
import { Type } from 'class-transformer';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class AssetBalanceDto {
    @ApiProperty({
        description:
            'The specific asset (token or unified token) this balance refers to.',
        oneOf: [
            { $ref: getSchemaPath(TokenDto) },
            { $ref: getSchemaPath(UnifiedTokenDto) },
        ],
        discriminator: {
            propertyName: 'type',
            mapping: {
                single: getSchemaPath(TokenDto),
                unified: getSchemaPath(UnifiedTokenDto),
            },
        },
    })
    @Type(() => Object, {
        discriminator: {
            property: 'type',
            subTypes: [
                { value: TokenDto, name: 'single' },
                { value: UnifiedTokenDto, name: 'unified' },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    asset: TokenDto | UnifiedTokenDto;
    @ApiProperty({
        type: BalanceDto,
        description: 'The balance of the asset.',
    })
    @Type(() => BalanceDto)
    balance: BalanceDto;

    constructor(asset: TokenDto | UnifiedTokenDto, balance: BalanceDto) {
        this.asset = asset;
        this.balance = balance;
    }
}
