import { Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import {
    DUNE_CHAIN_MAPPER,
    DuneChainMapper,
} from '@/chain/mappers/dune-chain.mapper';

@Module({
    providers: [
        {
            provide: DUNE_CHAIN_MAPPER,
            useClass: DuneChainMapper,
        },
        ChainService,
    ],
    exports: [DUNE_CHAIN_MAPPER, ChainService],
})
export class ChainModule {}
