import { Decimal } from '@prisma/client/runtime/library';
import { WalletBalance } from '@prisma/client';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';

export class WalletTotalBalanceDto {
    balanceQuote: Decimal;
    balanceQuoteChange: Decimal | null;
    balanceQuoteChangePercent: Decimal | null;
    timestamp: Date;

    constructor(
        walletBalance: WalletBalance,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        this.balanceQuote = walletBalance.balanceUsd; // For now, we use balanceUsd as balanceQuote
        this.timestamp = walletBalance.timestamp;
        this.balanceQuoteChange = balanceQuoteChange;
        this.balanceQuoteChangePercent =
            balanceQuoteChangePercent ??
            (balanceQuoteChange !== null
                ? calculateChangePercent(
                      walletBalance.balanceUsd,
                      balanceQuoteChange,
                  )
                : null);
    }
}
