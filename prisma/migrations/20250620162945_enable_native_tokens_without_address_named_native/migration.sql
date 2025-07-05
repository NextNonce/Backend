/*
  Warnings:

  - Made the column `address` on table `tokens` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tokens" ALTER COLUMN "address" SET NOT NULL;
