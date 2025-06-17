/*
  Warnings:

  - You are about to drop the `auth_trigger_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('SIMPLE', 'SMART');

-- CreateEnum
CREATE TYPE "ChainType" AS ENUM ('EVM', 'CAIROVM');

-- CreateEnum
CREATE TYPE "PortfolioAccess" AS ENUM ('PRIVATE', 'PUBLIC', 'UNLISTED');

-- DropTable
DROP TABLE "auth_trigger_log";

-- CreateTable
CREATE TABLE "Wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "portfolioAccess" "PortfolioAccess" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlists" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WalletsToWatchlists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WalletsToWatchlists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PortfoliosToWallets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PortfoliosToWallets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallets_address_key" ON "Wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Chains_name_key" ON "Chains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlists_ownerId_key" ON "Watchlists"("ownerId");

-- CreateIndex
CREATE INDEX "_WalletsToWatchlists_B_index" ON "_WalletsToWatchlists"("B");

-- CreateIndex
CREATE INDEX "_PortfoliosToWallets_B_index" ON "_PortfoliosToWallets"("B");

-- AddForeignKey
ALTER TABLE "Portfolios" ADD CONSTRAINT "Portfolios_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlists" ADD CONSTRAINT "Watchlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WalletsToWatchlists" ADD CONSTRAINT "_WalletsToWatchlists_A_fkey" FOREIGN KEY ("A") REFERENCES "Wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WalletsToWatchlists" ADD CONSTRAINT "_WalletsToWatchlists_B_fkey" FOREIGN KEY ("B") REFERENCES "Watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PortfoliosToWallets" ADD CONSTRAINT "_PortfoliosToWallets_A_fkey" FOREIGN KEY ("A") REFERENCES "Portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PortfoliosToWallets" ADD CONSTRAINT "_PortfoliosToWallets_B_fkey" FOREIGN KEY ("B") REFERENCES "Wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
