import { TokenDto } from '@/token/dto/token.dto';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';
import { BalanceDto } from '@/balance/dto/balance.dto';
import { Type } from 'class-transformer';

export class AssetBalanceDto {
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
    @Type(() => BalanceDto)
    balance: BalanceDto;

    constructor(asset: TokenDto | UnifiedTokenDto, balance: BalanceDto) {
        this.asset = asset;
        this.balance = balance;
    }
}
