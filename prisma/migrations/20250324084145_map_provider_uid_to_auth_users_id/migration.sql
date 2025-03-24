/*
  Warnings:

  - You are about to drop the column `providerUid` on the `Auth` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[auth.users.id]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider,auth.users.id]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `auth.users.id` to the `Auth` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Auth_provider_providerUid_key";

-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "providerUid",
ADD COLUMN     "auth.users.id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Auth_auth.users.id_key" ON "Auth"("auth.users.id");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_provider_auth.users.id_key" ON "Auth"("provider", "auth.users.id");
