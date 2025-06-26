import { TokenDto } from '@/token/dto/token.dto';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';
import { BalanceDto } from '@/balance/dto/balance.dto';

export class AssetBalanceDto {
    asset: TokenDto | UnifiedTokenDto;
    balance: BalanceDto;

    constructor(asset: TokenDto | UnifiedTokenDto, balance: BalanceDto) {
        this.asset = asset;
        this.balance = balance;
    }
}
