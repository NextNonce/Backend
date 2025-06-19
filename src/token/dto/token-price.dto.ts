import { Decimal } from '@prisma/client/runtime/library';
import { TokenPrice } from '@prisma/client';

export class TokenPriceDto {
    priceUsd: Decimal;
    change: Decimal | null;
    timestamp: Date;

    constructor(tokenPrice: TokenPrice, change: Decimal | null = null) {
        this.priceUsd = tokenPrice.priceUsd;
        this.change = change;
        this.timestamp = tokenPrice.timestamp;
    }
}
