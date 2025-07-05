import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import {
    ADDRESS_MIN_LENGTH,
    ADDRESS_MAX_LENGTH,
} from '@/wallet/constants/address.constants';

export class WalletIdentifierDto {
    @ApiProperty({
        description: 'The unique address of the wallet',
        example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        type: 'string',
        minLength: ADDRESS_MIN_LENGTH,
        maxLength: ADDRESS_MAX_LENGTH,
    })
    @IsNotEmpty()
    @IsString()
    @Length(ADDRESS_MIN_LENGTH, ADDRESS_MAX_LENGTH) // 0x-prefixed address length
    address: string;
}
