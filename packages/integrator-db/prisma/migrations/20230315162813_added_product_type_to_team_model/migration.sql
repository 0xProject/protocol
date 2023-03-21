/*
  Warnings:

  - Added the required column `product_type` to the `integrator_teams` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "integrator_teams" ADD COLUMN     "product_type" TEXT NOT NULL;
