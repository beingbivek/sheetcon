-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "BusinessProduct" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "sheetRowIndex" INTEGER,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "description" TEXT,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessProduct_sheetConnectionId_externalSheetId_idx" ON "BusinessProduct"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessProduct_syncStatus_idx" ON "BusinessProduct"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProduct_sheetConnectionId_id_key" ON "BusinessProduct"("sheetConnectionId", "id");

-- AddForeignKey
ALTER TABLE "BusinessProduct" ADD CONSTRAINT "BusinessProduct_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
