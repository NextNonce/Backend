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

export class DuneChainMapper implements ChainMapper {
    toChainName(externalChainName: string): string {
        const name = DUNE_CHAIN_NAME_TO_NN_CHAIN_NAME[externalChainName];
        if (!name) throw new Error(`Unknown Dune chain “${externalChainName}”`);
        return name;
    }

    toExternalChainId(nnChainName: string): string {
        switch (nnChainName) {
            case 'ethereum':
                return '1';
            case 'optimism':
                return '10';
            case 'flare':
                return '14';
            case 'bnb':
                return '56';
            case 'gnosis':
                return '100';
            case 'polygon':
                return '137';
            case 'fantom':
                return '250';
            case 'zksync':
                return '324';
            case 'metis':
                return '1088';
            case 'mantle':
                return '5000';
            case 'base':
                return '8453';
            case 'arbitrum':
                return '42161';
            case 'avalanche':
                return '43114';
            case 'linea':
                return '59144';
            case 'scroll':
                return '534352';
            default:
                throw new Error(`Unknown NN chain “${nnChainName}”`);
        }
    }
}
