import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { TotalBalanceDto } from '@/balance/dto/balance.dto';
import { Type } from 'class-transformer';

export class WalletBalancesDto {
    @Type(() => TotalBalanceDto)
    totalBalance: TotalBalanceDto;
    @Type(() => AssetBalanceDto)
    assetBalances: AssetBalanceDto[];
}
