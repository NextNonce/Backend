import {
    TokenIdentifier,
    TokenWithDetails,
    TokenWithMetadata,
} from '@/token/types/token.types';

export function toTokenWithMetadata(
    tokenWithDetails: TokenWithDetails,
): TokenWithMetadata {
    return {
        id: tokenWithDetails.id,
        chainName: tokenWithDetails.chain.name,
        address: tokenWithDetails.address,
        tokenMetadata: tokenWithDetails.tokenMetadata,
    };
}

export function getKeyFromTokenIdentifier(
    tokenIdentifier: TokenIdentifier,
): string {
    return getKeyFromChainNameAndAddress(
        tokenIdentifier.chainName,
        tokenIdentifier.address,
    );
}

export function getKeyFromChainNameAndAddress(
    chainName: string,
    address: string,
): string {
    return `${chainName}-${address}`;
}
