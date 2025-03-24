/*
  Warnings:

  - You are about to drop the column `auth.users.id` on the `Auth` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerUid]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider,providerUid]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerUid` to the `Auth` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Auth_auth.users.id_key";

-- DropIndex
DROP INDEX "Auth_provider_auth.users.id_key";

-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "auth.users.id",
ADD COLUMN     "providerUid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Auth_providerUid_key" ON "Auth"("providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_provider_providerUid_key" ON "Auth"("provider", "providerUid");
