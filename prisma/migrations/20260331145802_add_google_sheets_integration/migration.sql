/*
  Warnings:

  - You are about to drop the column `lastSyncedAt` on the `SheetConnection` table. All the data in the column will be lost.
  - You are about to drop the column `syncError` on the `SheetConnection` table. All the data in the column will be lost.
  - You are about to drop the column `lastCrudReset` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SheetConnection" DROP COLUMN "lastSyncedAt",
DROP COLUMN "syncError",
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "sheetName" TEXT,
ADD COLUMN     "syncErrorMessage" TEXT,
ALTER COLUMN "spreadsheetUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastCrudReset",
ADD COLUMN     "lastCrudResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SheetOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "rowsAffected" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetOperation_userId_idx" ON "SheetOperation"("userId");

-- CreateIndex
CREATE INDEX "SheetOperation_sheetId_idx" ON "SheetOperation"("sheetId");

-- CreateIndex
CREATE INDEX "SheetOperation_createdAt_idx" ON "SheetOperation"("createdAt");

-- CreateIndex
CREATE INDEX "SheetConnection_templateId_idx" ON "SheetConnection"("templateId");

-- CreateIndex
CREATE INDEX "SheetConnection_spreadsheetId_idx" ON "SheetConnection"("spreadsheetId");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "SheetConnection" ADD CONSTRAINT "SheetConnection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
