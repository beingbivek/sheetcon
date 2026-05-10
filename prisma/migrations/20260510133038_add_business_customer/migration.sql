-- CreateTable
CREATE TABLE "BusinessCustomer" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'WALK_IN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCustomer_sheetConnectionId_externalSheetId_idx" ON "BusinessCustomer"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessCustomer_syncStatus_idx" ON "BusinessCustomer"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCustomer_sheetConnectionId_id_key" ON "BusinessCustomer"("sheetConnectionId", "id");

-- AddForeignKey
ALTER TABLE "BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
