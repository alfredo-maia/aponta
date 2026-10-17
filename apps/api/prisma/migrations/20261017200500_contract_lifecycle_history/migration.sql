-- CreateTable
CREATE TABLE "ContractLifecycleEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractLifecycleEvent_contractId_effectiveFrom_idx" ON "ContractLifecycleEvent"("contractId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "ContractLifecycleEvent" ADD CONSTRAINT "ContractLifecycleEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
