/*
  Warnings:

  - You are about to drop the `portfolio_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "portfolio_balances" DROP CONSTRAINT "portfolio_balances_portfolioId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_balances" DROP CONSTRAINT "wallet_balances_walletId_fkey";

-- DropForeignKey
ALTER TABLE "wallets_tokens" DROP CONSTRAINT "wallets_tokens_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "wallets_tokens" DROP CONSTRAINT "wallets_tokens_walletId_fkey";

-- DropTable
DROP TABLE "portfolio_balances";

-- DropTable
DROP TABLE "wallet_balances";

-- DropTable
DROP TABLE "wallets_tokens";
