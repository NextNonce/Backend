/*
  Warnings:

  - A unique constraint covering the columns `[chainId,address]` on the table `tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "token_prices" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_prices_tokenId_createdAt_key" ON "token_prices"("tokenId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_chainId_address_key" ON "tokens"("chainId", "address");

-- AddForeignKey
ALTER TABLE "token_prices" ADD CONSTRAINT "token_prices_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
