import { Module } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { MetadataModule } from '@/metadata/metadata.module';
import { ChainModule } from '@/chain/chain.module';
import { BALANCE_PROVIDER } from '@/balance/interfaces/balance-provider.interface';
import { OkxDexBalanceProvider } from '@/balance/providers/okx-dex-balance.provider';
import { PriceModule } from '@/price/price.module';
import { TokenModule } from '@/token/token.module';

@Module({
    imports: [MetadataModule, ChainModule, PriceModule, TokenModule],
    providers: [
        {
            provide: BALANCE_PROVIDER,
            useClass: OkxDexBalanceProvider,
        },
        BalanceService,
    ],
    exports: [BalanceService],
})
export class BalanceModule {}
