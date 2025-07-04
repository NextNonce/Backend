import {
    Controller,
    Get,
    Param,
    Sse,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletIdentifierDto } from './dto/wallet-identifier.dto';
import { WalletDto } from '@/wallet/dto/wallet.dto';
import { Wallet } from '@prisma/client';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@/auth/decorators';
import { BalanceService } from '@/balance/balance.service';
import { WalletBalancesDto } from '@/balance/dto/wallet-balances.dto';

@ApiTags('wallets')
@Auth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('wallets')
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
        private readonly balanceService: BalanceService,
    ) {}

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

    @Get(':address/balances')
    @ApiOkResponse({
        description:
            'Returns actual wallet balances for the specified wallet address',
        type: WalletBalancesDto,
    })
    async getBalances(
        @Param() walletIdentifierDto: WalletIdentifierDto,
    ): Promise<WalletBalancesDto> {
        return await this.balanceService.getWalletBalances(
            walletIdentifierDto.address,
        );;
    }
}
