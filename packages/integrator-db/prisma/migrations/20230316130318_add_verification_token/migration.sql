/*
  Warnings:

  - You are about to drop the column `identifier` on the `verification_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `verification_tokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verification_token]` on the table `verification_tokens` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `verification_tokens` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `user_email` to the `verification_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verification_token` to the `verification_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "verification_tokens_identifier_token_key";

-- DropIndex
DROP INDEX "verification_tokens_token_key";

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "identifier",
DROP COLUMN "token",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "user_email" TEXT NOT NULL,
ADD COLUMN     "verification_token" TEXT NOT NULL,
ADD CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_verification_token_key" ON "verification_tokens"("verification_token");

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_email_fkey" FOREIGN KEY ("user_email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;
