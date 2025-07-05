import { TokenWithMetadata } from '@/token/types/token.types';
import { ExternalTokenBalanceDto } from '@/balance/dto/external-token-balance.dto';
import { TokenDto } from '@/token/dto/token.dto';
import { BalanceDto } from '@/balance/dto/balance.dto';

export type TokenWithMetadataAndExternalBalance = {
    tokenWithMetadata: TokenWithMetadata;
    externalBalance: ExternalTokenBalanceDto;
};

export type SingleTokenBalance = {
    token: TokenDto;
    balance: BalanceDto;
};
