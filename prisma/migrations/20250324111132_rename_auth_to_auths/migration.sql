/*
  Warnings:

  - You are about to drop the `Auth` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Auth" DROP CONSTRAINT "Auth_userId_fkey";

-- DropTable
DROP TABLE "Auth";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "auth_trigger_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_trigger_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auths" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerUid" UUID NOT NULL,

    CONSTRAINT "Auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auths_userId_key" ON "Auths"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Auths_providerUid_key" ON "Auths"("providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "Auths_provider_providerUid_key" ON "Auths"("provider", "providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Auths" ADD CONSTRAINT "Auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
