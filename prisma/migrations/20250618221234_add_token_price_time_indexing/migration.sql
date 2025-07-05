/*
  Warnings:

  - You are about to drop the column `createdAt` on the `token_prices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenId,timestamp]` on the table `token_prices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "token_prices_tokenId_createdAt_key";

-- AlterTable
ALTER TABLE "token_prices" DROP COLUMN "createdAt",
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "token_prices_timestamp_idx" ON "token_prices"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "token_prices_tokenId_timestamp_key" ON "token_prices"("tokenId", "timestamp");
