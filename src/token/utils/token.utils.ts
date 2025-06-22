import { TokenWithDetails, TokenWithMetadata } from '@/token/types/token.types';

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
