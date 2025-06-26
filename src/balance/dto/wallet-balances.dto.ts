import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { TotalBalanceDto } from '@/balance/dto/balance.dto';

export class WalletBalancesDto {
    totalBalance: TotalBalanceDto | null;
    assetBalances: AssetBalanceDto[];
}
