import { ChainMapper } from '../interfaces/chain-mapper.interface';

export const DUNE_CHAIN_MAPPER = Symbol.for('DUNE_CHAIN_MAPPER');

const DUNE_CHAIN_NAME_TO_NN_CHAIN_NAME: Record<string, string> = {
    ethereum: 'ethereum',
    optimism: 'optimism',
    flare: 'flare',
    bnb: 'bnb',
    gnosis: 'gnosis',
    polygon: 'polygon',
    fantom: 'fantom',
    zksync: 'zksync',
    metis: 'metis',
    mantle: 'mantle',
    base: 'base',
    arbitrum: 'arbitrum',
    avalanche_c: 'avalanche',
    linea: 'linea',
    scroll: 'scroll',
};

const NN_CHAIN_NAME_TO_DUNE_CHAIN_ID: Record<string, string> = {
    ethereum: '1',
    optimism: '10',
    flare: '14',
    bnb: '56',
    gnosis: '100',
    polygon: '137',
    fantom: '250',
    zksync: '324',
    metis: '1088',
    mantle: '5000',
    base: '8453',
    arbitrum: '42161',
    avalanche: '43114',
    linea: '59144',
    scroll: '534352',
};

export class DuneChainMapper implements ChainMapper {
    toChainName(externalChainId: string): string {
        const name = DUNE_CHAIN_NAME_TO_NN_CHAIN_NAME[externalChainId];
        if (!name) throw new Error(`Unknown Dune chain “${externalChainId}”`);
        return name;
    }

    toExternalChainId(nnChainName: string): string {
        const chainId = NN_CHAIN_NAME_TO_DUNE_CHAIN_ID[nnChainName];
        if (!chainId) throw new Error(`Unknown NN chain “${nnChainName}”`);
        return chainId;
    }
}
