import { ApiProperty } from '@nestjs/swagger';
import {
    ADDRESS_MAX_LENGTH,
    ADDRESS_MIN_LENGTH,
} from '@/wallet/constants/address.constants';
import { ChainType, PortfolioWallet, Wallet, WalletType } from '@prisma/client';

export class PortfolioWalletDto {
    @ApiProperty({
        type: 'string',
        minLength: ADDRESS_MIN_LENGTH,
        maxLength: ADDRESS_MAX_LENGTH,
        example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
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
