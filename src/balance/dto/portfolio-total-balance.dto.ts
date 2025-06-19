import { Decimal } from '@prisma/client/runtime/library';
import { PortfolioBalance } from '@prisma/client';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';

export class PortfolioTotalBalanceDto {
    balanceQuote: Decimal;
    balanceQuoteChange: Decimal | null;
    balanceQuoteChangePercent: Decimal | null;
    timestamp: Date;

    constructor(
        portfolioBalance: PortfolioBalance,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        this.balanceQuote = portfolioBalance.balanceUsd; // For now, we use balanceUsd as balanceQuote
        this.timestamp = portfolioBalance.timestamp;
        this.balanceQuoteChange = balanceQuoteChange;
        this.balanceQuoteChangePercent =
            balanceQuoteChangePercent ??
            (balanceQuoteChange !== null
                ? calculateChangePercent(
                      portfolioBalance.balanceUsd,
                      balanceQuoteChange,
                  )
                : null);
    }
}
