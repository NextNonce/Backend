import { Decimal } from '@prisma/client/runtime/library';

export type TokenPriceUpdate = {
    tokenId: string;
    priceUsd: Decimal;
};

export type PriceInfo = {
    tokenId: string;
    currentPriceUsd: Decimal;
    priceUsdChange: Decimal | undefined; // undefined if no historical data is available
    timestamp: Date;
};

export type CachedPriceData = {
    price: string;
};
