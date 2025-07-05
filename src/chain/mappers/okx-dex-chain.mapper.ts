import { ChainMapper } from '@/chain/interfaces/chain-mapper.interface';

export const OKX_DEX_CHAIN_MAPPER = Symbol.for('OKX_DEX_CHAIN_MAPPER');

const OKX_DEX_CHAIN_ID_TO_NN_CHAIN_NAME: Record<string, string> = {
    '1': 'ethereum', // Ethereum Mainnet
    '10': 'optimism', // Optimism Mainnet
    '14': 'flare', // Flare Mainnet
    '56': 'bnb', // BNB Chain Mainnet
    '100': 'gnosis', // Gnosis Chain
    '137': 'polygon', // Polygon Mainnet
    '250': 'fantom', // Fantom Opera
    '324': 'zksync', // zkSync Era Mainnet
    '1088': 'metis', // Metis Andromeda
    '5000': 'mantle', // Mantle Mainnet
    '8453': 'base', // Base Mainnet
    '42161': 'arbitrum', // Arbitrum One
    '43114': 'avalanche', // Avalanche C-Chain
    '59144': 'linea', // Linea Mainnet
    '534352': 'scroll', // Scroll Mainnet
};

const NN_CHAIN_NAME_TO_OKX_DEX_CHAIN_ID: Record<string, string> =
    Object.fromEntries(
        Object.entries(OKX_DEX_CHAIN_ID_TO_NN_CHAIN_NAME).map(
            ([key, value]) => [value, key],
        ),
    );

export class OkxDexChainMapper implements ChainMapper {
    toChainName(externalChainId: string): string {
        const name = OKX_DEX_CHAIN_ID_TO_NN_CHAIN_NAME[externalChainId];
        if (!name)
            throw new Error(`Unknown OKX DEX chain “${externalChainId}”`);
        return name;
    }

    toExternalChainId(nnChainName: string): string {
        const chainId = NN_CHAIN_NAME_TO_OKX_DEX_CHAIN_ID[nnChainName];
        if (!chainId) throw new Error(`Unknown NN chain “${nnChainName}”`);
        return chainId;
    }
}
