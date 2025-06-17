import { ChainType, Wallet, WalletType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
    WALLET_ADDRESS_MAX_LENGTH,
    WALLET_ADDRESS_MIN_LENGTH,
} from '@/wallet/constants/address.constants';

export class WalletDto {
    @ApiProperty({
        type: 'string',
        minLength: WALLET_ADDRESS_MIN_LENGTH,
        maxLength: WALLET_ADDRESS_MAX_LENGTH,
    })
    address: string;
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

    static fromModel(wallet: Wallet): WalletDto {
        const dto = new WalletDto();
        dto.address = wallet.address;
        dto.walletType = wallet.walletType;
        dto.chainType = wallet.chainType;
        dto.createdAt = wallet.createdAt;
        dto.updatedAt = wallet.updatedAt;
        return dto;
    }
}
