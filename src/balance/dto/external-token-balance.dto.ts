import { Decimal } from '@prisma/client/runtime/library';

export class ExternalTokenBalanceDto {
    chainName: string;
    address: string; // "native" for native tokens
    balance: Decimal;
    priceUsd: Decimal;
    balanceUsd: Decimal;

    constructor(init: Partial<ExternalTokenBalanceDto>) {
        Object.assign(this, init);
    }
}
