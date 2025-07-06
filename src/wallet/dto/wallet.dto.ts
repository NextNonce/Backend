import { ChainType, Wallet, WalletType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
    ADDRESS_MAX_LENGTH,
    ADDRESS_MIN_LENGTH,
} from '@/wallet/constants/address.constants';

export class WalletDto {
    @ApiProperty({
        type: 'string',
        minLength: ADDRESS_MIN_LENGTH,
        maxLength: ADDRESS_MAX_LENGTH,
        example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
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
