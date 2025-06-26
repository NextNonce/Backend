import { BalanceDto } from '@/balance/dto/balance.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { UnifiedTokenWithDetails } from '@/token/types/unified-token.types';


export type SubTokenAggregation = {
    // The summed-up balance for this specific token.
    aggregatedBalance: BalanceDto;
    // A representative DTO for this token, used to build the final list.
    representativeAsset: TokenDto;
};

// The main aggregation state for a whole group (e.g., all USDC).
export type AggregationState = {
    // A map where the key is the unique sub-token ID (e.g., "polygon-0x...")
    // and the value is its aggregated data.
    subTokenAggregations: Map<string, SubTokenAggregation>;
    // The canonical details for this group from the DB, if it's a unified group.
    unifiedTokenDetails: UnifiedTokenWithDetails | undefined;
};