/*
  Warnings:

  - You are about to alter the column `priceUsd` on the `token_prices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "token_prices" ALTER COLUMN "priceUsd" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "wallets_tokens" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_tokens_walletId_tokenId_key" ON "wallets_tokens"("walletId", "tokenId");

-- AddForeignKey
ALTER TABLE "wallets_tokens" ADD CONSTRAINT "wallets_tokens_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets_tokens" ADD CONSTRAINT "wallets_tokens_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
