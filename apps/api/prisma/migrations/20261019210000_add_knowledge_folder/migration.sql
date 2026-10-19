-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "KnowledgeFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_folderId_idx" ON "Article"("folderId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "KnowledgeFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
