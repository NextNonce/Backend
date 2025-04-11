import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePortfolioWalletDto {
    @ApiPropertyOptional({
        description: 'Custom name for the wallet within the portfolio',
        example: 'My Savings Wallet',
    })
    @IsOptional()
    @IsString()
    walletName?: string;
}
