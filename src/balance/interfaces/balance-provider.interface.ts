import { ExternalTokenBalanceDto } from '@/balance/dto/external-token-balance.dto';

export const BALANCE_PROVIDER = Symbol('BALANCE_PROVIDER');

export interface BalanceProvider {
    /**
     * Given a wallet address and an array of chain names,
     * return the token balances for that wallet on those chains.
     * @param address - The wallet address to check balances for.
     * @param chainNames - An array of chain names to check balances on.
     */
    getTokenBalances(
        address: string,
        chainNames: string[],
    ): Promise<ExternalTokenBalanceDto[]> | undefined;
}
