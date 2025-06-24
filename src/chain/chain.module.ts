import { Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import {
    DUNE_CHAIN_MAPPER,
    DuneChainMapper,
} from '@/chain/mappers/dune-chain.mapper';
import {
    OKX_DEX_CHAIN_MAPPER,
    OkxDexChainMapper,
} from '@/chain/mappers/okx-dex-chain.mapper';

@Module({
    providers: [
        {
            provide: DUNE_CHAIN_MAPPER,
            useClass: DuneChainMapper,
        },
        {
            provide: OKX_DEX_CHAIN_MAPPER,
            useClass: OkxDexChainMapper,
        },
        ChainService,
    ],
    exports: [DUNE_CHAIN_MAPPER, OKX_DEX_CHAIN_MAPPER, ChainService],
})
export class ChainModule {}
