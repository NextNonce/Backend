/*
  Warnings:

  - You are about to alter the column `balanceUsd` on the `portfolio_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(38,18)`.
  - You are about to alter the column `priceUsd` on the `token_prices` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(38,18)`.
  - You are about to alter the column `balanceUsd` on the `wallet_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(38,18)`.
  - You are about to alter the column `balance` on the `wallets_tokens` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(38,18)`.

*/
-- AlterTable
ALTER TABLE "portfolio_balances" ALTER COLUMN "balanceUsd" SET DATA TYPE DECIMAL(38,18);

-- AlterTable
ALTER TABLE "token_prices" ALTER COLUMN "priceUsd" SET DATA TYPE DECIMAL(38,18);

-- AlterTable
ALTER TABLE "wallet_balances" ALTER COLUMN "balanceUsd" SET DATA TYPE DECIMAL(38,18);

-- AlterTable
ALTER TABLE "wallets_tokens" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(38,18);
