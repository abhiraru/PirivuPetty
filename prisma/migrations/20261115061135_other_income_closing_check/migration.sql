-- CreateEnum
CREATE TYPE "ReceivedIn" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('BANK_INTEREST', 'SPONSORSHIP', 'DONATION', 'REFUND', 'OTHER');

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "countedBank" INTEGER,
ADD COLUMN     "countedCash" INTEGER,
ADD COLUMN     "reconAt" TIMESTAMP(3),
ADD COLUMN     "reconById" TEXT,
ADD COLUMN     "reconNote" TEXT;

-- CreateTable
CREATE TABLE "OtherIncome" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "source" "IncomeSource" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedIn" "ReceivedIn" NOT NULL,
    "receivedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'VALID',
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtherIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtherIncome_festivalId_idx" ON "OtherIncome"("festivalId");

-- AddForeignKey
ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only one festival can be active at a time. Enforced by the database itself, so no code path
-- and no manual edit can ever leave two festivals active.
CREATE UNIQUE INDEX "Festival_only_one_active" ON "Festival" ("status") WHERE "status" = 'ACTIVE';
