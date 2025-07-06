import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { TotalBalanceDto } from '@/balance/dto/balance.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WalletBalancesDto {
    @ApiProperty({
        type: [TotalBalanceDto],
        description: 'Total balance of the wallet across different chains.',
    })
    @Type(() => TotalBalanceDto)
    totalBalance: TotalBalanceDto;
    @ApiProperty({
        type: [AssetBalanceDto],
        description: "List of wallet's asset balances.",
    })
    @Type(() => AssetBalanceDto)
    assetBalances: AssetBalanceDto[];
}
