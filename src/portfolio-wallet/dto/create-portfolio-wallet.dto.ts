import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletIdentifierDto } from '@/wallet/dto/wallet-identifier.dto';

export class CreatePortfolioWalletDto extends WalletIdentifierDto {
    @ApiPropertyOptional({
        type: 'string',
        description: 'Custom name for the wallet within the portfolio',
        example: 'My Savings Wallet',
        minLength: 1,
        maxLength: 24,
    })
    @IsOptional()
    @IsString()
    name?: string;
}
