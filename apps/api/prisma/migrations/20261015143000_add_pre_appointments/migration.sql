-- CreateTable
CREATE TABLE "PreAppointment" (
    "id" TEXT NOT NULL,
    "beginning" TIMESTAMP(3) NOT NULL,
    "ending" TIMESTAMP(3),
    "initTime" TEXT NOT NULL,
    "endTime" TEXT,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreAppointment_ticketId_idx" ON "PreAppointment"("ticketId");

-- AddForeignKey
ALTER TABLE "PreAppointment" ADD CONSTRAINT "PreAppointment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreAppointment" ADD CONSTRAINT "PreAppointment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
