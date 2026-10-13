-- CreateEnum
CREATE TYPE "ValuationType" AS ENUM ('CONTRACT', 'GUARANTEE', 'MANUAL');

-- AlterTable
ALTER TABLE "Worklog" ADD COLUMN     "valuationType" "ValuationType" NOT NULL DEFAULT 'CONTRACT',
ADD COLUMN     "value" DOUBLE PRECISION;
