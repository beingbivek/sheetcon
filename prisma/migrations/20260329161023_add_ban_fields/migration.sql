-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SheetConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sheetType" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetName" TEXT NOT NULL,
    "spreadsheetUrl" TEXT NOT NULL,
    "templateId" TEXT,
    "templateLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "columnMappings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetConnection_userId_isActive_idx" ON "SheetConnection"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SheetConnection_userId_spreadsheetId_key" ON "SheetConnection"("userId", "spreadsheetId");

-- AddForeignKey
ALTER TABLE "SheetConnection" ADD CONSTRAINT "SheetConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
