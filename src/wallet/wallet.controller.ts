import { Controller, Get, Post, Body } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallets')
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @Post()
    create(@Body() createWalletDto: CreateWalletDto) {
        return this.walletService.create(createWalletDto.address);
    }

    @Get()
    findAll() {
        //return this.walletService.findAll();
    }

    findOne() {
        //return this.walletService.findOne(+id);
    }
}
