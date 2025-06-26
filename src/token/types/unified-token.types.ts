import { Token, TokenMetadata, UnifiedToken } from '@prisma/client';

export type UnifiedTokenWithDetails = UnifiedToken & {
    tokens: Token[];
    tokenMetadata: TokenMetadata;
};
