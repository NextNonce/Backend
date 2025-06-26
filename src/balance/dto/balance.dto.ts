import { Decimal } from '@prisma/client/runtime/library';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';

abstract class AbstractBalanceDto {
    balanceQuote: Decimal;
    balanceQuoteChange: Decimal | null;
    balanceQuoteChangePercent: Decimal | null;

    protected constructor(
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        this.balanceQuote = balanceQuote;
        this.balanceQuoteChange = balanceQuoteChange;
        this.balanceQuoteChangePercent =
            balanceQuoteChangePercent ??
            (balanceQuoteChange !== null
                ? calculateChangePercent(balanceQuote, balanceQuoteChange)
                : null);
    }
}

export class BalanceDto extends AbstractBalanceDto {
    balanceNative: Decimal;

    constructor(
        balanceNative: Decimal,
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        super(balanceQuote, balanceQuoteChange, balanceQuoteChangePercent);
        this.balanceNative = balanceNative;
    }
}

export class TotalBalanceDto extends AbstractBalanceDto {
    constructor(
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        super(balanceQuote, balanceQuoteChange, balanceQuoteChangePercent);
    }
}
