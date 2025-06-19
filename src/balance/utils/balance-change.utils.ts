import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculates the change percentage based on the balance and the balance change.
 *
 * @param {Decimal} balance - The current balance.
 * @param {Decimal} balanceChange - The change in balance.
 * @returns {Decimal} - The change percentage as a Decimal.
 */
export function calculateChangePercent(
    balance: Decimal,
    balanceChange: Decimal,
): Decimal {
    const oldBalance = balance.minus(balanceChange);

    if (oldBalance.isZero()) {
        if (balanceChange.gt(0)) return new Decimal(100);
        return new Decimal(0); // Avoid division by zero
    }

    return balanceChange.div(oldBalance).mul(new Decimal(100));
}
