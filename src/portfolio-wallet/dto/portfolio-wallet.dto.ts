import { ApiProperty } from '@nestjs/swagger';
import {
    WALLET_ADDRESS_MAX_LENGTH,
    WALLET_ADDRESS_MIN_LENGTH,
} from '@/wallet/constants/address.constants';
import { ChainType, PortfolioWallet, Wallet, WalletType } from '@prisma/client';

export class PortfolioWalletDto {
    @ApiProperty({
        type: 'string',
        minLength: WALLET_ADDRESS_MIN_LENGTH,
        maxLength: WALLET_ADDRESS_MAX_LENGTH,
    })
    address: string;
    @ApiProperty({
        type: 'string',
        nullable: true,
    })
    name: string | null;
    @ApiProperty({
        enum: WalletType,
        enumName: 'WalletType',
    })
    walletType: WalletType;
    @ApiProperty({
        enum: ChainType,
        enumName: 'ChainType',
    })
    chainType: ChainType;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
    })
    createdAt: Date;
    @ApiProperty({
        type: 'string',
        format: 'date-time',
    })
    updatedAt: Date;

    static fromModels(
        portfolioWallet: PortfolioWallet,
        wallet: Wallet,
    ): PortfolioWalletDto {
        const dto = new PortfolioWalletDto();
        dto.address = wallet.address;
        dto.name = portfolioWallet.name;
        dto.walletType = wallet.walletType;
        dto.chainType = wallet.chainType;
        dto.createdAt = portfolioWallet.createdAt;
        dto.updatedAt = portfolioWallet.updatedAt;
        return dto;
    }
}
