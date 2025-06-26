import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { TotalBalanceDto } from '@/balance/dto/balance.dto';

export class PortfolioBalancesDto {
    actual: boolean;
    totalBalance: TotalBalanceDto | null;
    assetBalances: AssetBalanceDto[];
}
