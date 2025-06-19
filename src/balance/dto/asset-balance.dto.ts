import { TokenDto } from '@/token/dto/token.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { UnifiedTokenDto } from '@/token/dto/unified-token.dto';
import { calculateChangePercent } from '@/balance/utils/balance-change.utils';

export class AssetBalanceDto {
    asset: TokenDto | UnifiedTokenDto;
    balance: Decimal;
    balanceQuote: Decimal;
    balanceQuoteChange: Decimal | null;
    balanceQuoteChangePercent: Decimal | null;

    constructor(
        asset: TokenDto | UnifiedTokenDto,
        balance: Decimal,
        balanceQuote: Decimal,
        balanceQuoteChange: Decimal | null = null,
        balanceQuoteChangePercent: Decimal | null = null,
    ) {
        this.asset = asset;
        this.balance = balance;
        this.balanceQuote = balanceQuote;
        this.balanceQuoteChange = balanceQuoteChange;
        this.balanceQuoteChangePercent =
            balanceQuoteChangePercent ??
            (balanceQuoteChange !== null
                ? calculateChangePercent(balanceQuote, balanceQuoteChange)
                : null);
    }
}
