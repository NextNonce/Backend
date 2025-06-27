import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { BalanceModule } from '@/balance/balance.module';
import { WalletTypeUtils } from '@/wallet/utils/wallet-type.utils';
import { AddressUtils } from '@/wallet/utils/address.utils';

@Module({
    imports: [BalanceModule],
    controllers: [WalletController],
    providers: [WalletService, WalletTypeUtils, AddressUtils],
    exports: [WalletService],
})
export class WalletModule {}
