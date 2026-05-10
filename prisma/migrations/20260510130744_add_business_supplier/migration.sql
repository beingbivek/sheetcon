-- CreateTable
CREATE TABLE "BusinessSupplier" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "contactPerson" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessSupplier_sheetConnectionId_externalSheetId_idx" ON "BusinessSupplier"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessSupplier_syncStatus_idx" ON "BusinessSupplier"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSupplier_sheetConnectionId_id_key" ON "BusinessSupplier"("sheetConnectionId", "id");

-- AddForeignKey
ALTER TABLE "BusinessSupplier" ADD CONSTRAINT "BusinessSupplier_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
