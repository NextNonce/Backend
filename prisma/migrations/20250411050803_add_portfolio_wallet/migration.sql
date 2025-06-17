/*
  Warnings:

  - You are about to drop the `_PortfolioToWallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PortfolioToWallet" DROP CONSTRAINT "_PortfolioToWallet_A_fkey";

-- DropForeignKey
ALTER TABLE "_PortfolioToWallet" DROP CONSTRAINT "_PortfolioToWallet_B_fkey";

-- DropTable
DROP TABLE "_PortfolioToWallet";

-- CreateTable
CREATE TABLE "portfolio_wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "portfolioId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_wallets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "portfolio_wallets" ADD CONSTRAINT "portfolio_wallets_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_wallets" ADD CONSTRAINT "portfolio_wallets_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
