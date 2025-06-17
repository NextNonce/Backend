-- DropForeignKey
ALTER TABLE "auths" DROP CONSTRAINT "auths_userId_fkey";

-- AddForeignKey
ALTER TABLE "auths" ADD CONSTRAINT "auths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
