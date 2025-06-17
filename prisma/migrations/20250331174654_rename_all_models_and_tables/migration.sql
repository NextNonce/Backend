/*
  Warnings:

  - You are about to drop the `Auth` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Chains` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Portfolios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Watchlists` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PortfoliosToWallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_WalletsToWatchlists` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Auth" DROP CONSTRAINT "Auth_userId_fkey";

-- DropForeignKey
ALTER TABLE "Portfolios" DROP CONSTRAINT "Portfolios_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Watchlists" DROP CONSTRAINT "Watchlists_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "_PortfoliosToWallets" DROP CONSTRAINT "_PortfoliosToWallets_A_fkey";

-- DropForeignKey
ALTER TABLE "_PortfoliosToWallets" DROP CONSTRAINT "_PortfoliosToWallets_B_fkey";

-- DropForeignKey
ALTER TABLE "_WalletsToWatchlists" DROP CONSTRAINT "_WalletsToWatchlists_A_fkey";

-- DropForeignKey
ALTER TABLE "_WalletsToWatchlists" DROP CONSTRAINT "_WalletsToWatchlists_B_fkey";

-- DropTable
DROP TABLE "Auth";

-- DropTable
DROP TABLE "Chains";

-- DropTable
DROP TABLE "Portfolios";

-- DropTable
DROP TABLE "Users";

-- DropTable
DROP TABLE "Wallets";

-- DropTable
DROP TABLE "Watchlists";

-- DropTable
DROP TABLE "_PortfoliosToWallets";

-- DropTable
DROP TABLE "_WalletsToWatchlists";

-- CreateTable
CREATE TABLE "auths" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" TEXT,
    "providerUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "derivationInfo" JSONB,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "portfolioAccess" "PortfolioAccess" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WalletToWatchlist" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WalletToWatchlist_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PortfolioToWallet" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PortfolioToWallet_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "auths_userId_key" ON "auths"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auths_providerUid_key" ON "auths"("providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "auths_provider_providerUid_key" ON "auths"("provider", "providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "chains_name_key" ON "chains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_ownerId_key" ON "watchlists"("ownerId");

-- CreateIndex
CREATE INDEX "_WalletToWatchlist_B_index" ON "_WalletToWatchlist"("B");

-- CreateIndex
CREATE INDEX "_PortfolioToWallet_B_index" ON "_PortfolioToWallet"("B");

-- AddForeignKey
ALTER TABLE "auths" ADD CONSTRAINT "auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WalletToWatchlist" ADD CONSTRAINT "_WalletToWatchlist_A_fkey" FOREIGN KEY ("A") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WalletToWatchlist" ADD CONSTRAINT "_WalletToWatchlist_B_fkey" FOREIGN KEY ("B") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PortfolioToWallet" ADD CONSTRAINT "_PortfolioToWallet_A_fkey" FOREIGN KEY ("A") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PortfolioToWallet" ADD CONSTRAINT "_PortfolioToWallet_B_fkey" FOREIGN KEY ("B") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
