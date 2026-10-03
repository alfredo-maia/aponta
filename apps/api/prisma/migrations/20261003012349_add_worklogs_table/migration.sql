-- CreateTable
CREATE TABLE "Worklog" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worklog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
