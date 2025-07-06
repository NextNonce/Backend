import { AssetBalanceDto } from '@/balance/dto/asset-balance.dto';
import { TotalBalanceDto } from '@/balance/dto/balance.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PortfolioBalancesDto {
    @ApiProperty({
        type: 'boolean',
        description:
            'Is true when balances data of all wallets in the portfolio are fresh.',
        example: true,
    })
    actual: boolean;
    @ApiProperty({
        type: TotalBalanceDto,
        description: 'Total balance of the portfolio.',
    })
    totalBalance: TotalBalanceDto;
    @ApiProperty({
        type: [AssetBalanceDto],
        description: 'List of asset balances in the portfolio.',
    })
    assetBalances: AssetBalanceDto[];
}
