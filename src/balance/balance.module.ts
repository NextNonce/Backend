import { Module } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { MetadataModule } from '@/metadata/metadata.module';
import { ChainModule } from '@/chain/chain.module';
import { OkxDexBalanceProvider } from '@/balance/providers/okx-dex-balance.provider';
import { PriceModule } from '@/price/price.module';
import { TokenModule } from '@/token/token.module';

@Module({
    providers: [BalanceService],
    imports: [MetadataModule, ChainModule, PriceModule, TokenModule],
    exports: [BalanceService],
})
export class BalanceModule {}
