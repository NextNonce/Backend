/*
  Warnings:

  - A unique constraint covering the columns `[portfolioId,walletId]` on the table `portfolios_wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[portfolioId,name]` on the table `portfolios_wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "portfolios_wallets_portfolioId_walletId_key" ON "portfolios_wallets"("portfolioId", "walletId");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_wallets_portfolioId_name_key" ON "portfolios_wallets"("portfolioId", "name");
