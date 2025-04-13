-- DropForeignKey
ALTER TABLE "portfolios_wallets" DROP CONSTRAINT "portfolios_wallets_portfolioId_fkey";

-- AddForeignKey
ALTER TABLE "portfolios_wallets" ADD CONSTRAINT "portfolios_wallets_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
