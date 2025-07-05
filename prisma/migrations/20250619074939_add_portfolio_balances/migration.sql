-- CreateTable
CREATE TABLE "portfolio_balances" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "balanceUsd" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_balances_portfolioId_timestamp_key" ON "portfolio_balances"("portfolioId", "timestamp");

-- AddForeignKey
ALTER TABLE "portfolio_balances" ADD CONSTRAINT "portfolio_balances_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
