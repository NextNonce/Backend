-- DropForeignKey
ALTER TABLE "portfolios" DROP CONSTRAINT "portfolios_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
