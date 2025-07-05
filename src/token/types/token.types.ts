import { Chain, Token, TokenMetadata } from '@prisma/client';

export type RawTokenMetadata = {
    chainName: string;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string; // Optional, as it might not be provided
    description?: string; // Optional, as it might not be provided
};

export type TokenIdentifier = {
    chainName: string;
    address: string;
};

export type TokenWithDetails = Token & {
    chain: Chain;
    tokenMetadata: TokenMetadata;
};

export type TokenWithMetadata = {
    id: string; // token id
    chainName: string;
    address: string;
    tokenMetadata: TokenMetadata;
};
