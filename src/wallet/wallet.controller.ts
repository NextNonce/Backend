import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletIdentifierDto } from './dto/wallet-identifier.dto';
import { WalletDto } from '@/wallet/dto/wallet.dto';
import { Wallet } from '@prisma/client';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @Get(':address')
    @ApiOkResponse({
        description:
            'Returns wallet details for the specified wallet address; creates the wallet if it does not exist',
        type: WalletDto,
    })
    async findOne(
        @Param() walletIdentifierDto: WalletIdentifierDto,
    ): Promise<WalletDto> {
        const wallet: Wallet = await this.walletService.findOrCreate(
            walletIdentifierDto.address,
        );
        return WalletDto.fromModel(wallet);
    }
}
