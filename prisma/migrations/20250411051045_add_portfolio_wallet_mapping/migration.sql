/*
  Warnings:

  - You are about to drop the `portfolio_wallets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "portfolio_wallets" DROP CONSTRAINT "portfolio_wallets_portfolioId_fkey";

-- DropForeignKey
ALTER TABLE "portfolio_wallets" DROP CONSTRAINT "portfolio_wallets_walletId_fkey";

-- DropTable
DROP TABLE "portfolio_wallets";

-- CreateTable
CREATE TABLE "portfolios_wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "portfolioId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_wallets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "portfolios_wallets" ADD CONSTRAINT "portfolios_wallets_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios_wallets" ADD CONSTRAINT "portfolios_wallets_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
