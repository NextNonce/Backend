import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import {
    WALLET_ADDRESS_MIN_LENGTH,
    WALLET_ADDRESS_MAX_LENGTH,
} from '@/wallet/constants/address.constants';

export class CreateWalletDto {
    @ApiProperty({
        type: 'string',
        minLength: WALLET_ADDRESS_MIN_LENGTH,
        maxLength: WALLET_ADDRESS_MAX_LENGTH,
    })
    @IsNotEmpty()
    @IsString()
    @Length(WALLET_ADDRESS_MIN_LENGTH, WALLET_ADDRESS_MAX_LENGTH) // 0x-prefixed address length
    address: string;
}
