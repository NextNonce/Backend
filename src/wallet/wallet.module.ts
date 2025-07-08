import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { BalanceModule } from '@/balance/balance.module';
import { WalletTypeUtils } from '@/wallet/utils/wallet-type.utils';
import { AddressUtils } from '@/wallet/utils/address.utils';
import { WALLET_TYPE_PROVIDER } from '@/wallet/interfaces/wallet-type-provider.interface';
import { AlchemyWalletTypeProvider } from '@/wallet/providers/alchemy-wallet-type.provider';

@Module({
    imports: [BalanceModule],
    controllers: [WalletController],
    providers: [
        WalletService,
        {
            provide: WALLET_TYPE_PROVIDER,
            useClass: AlchemyWalletTypeProvider,
        },
        WalletTypeUtils,
        AddressUtils,
    ],
    exports: [WalletService],
})
export class WalletModule {}
