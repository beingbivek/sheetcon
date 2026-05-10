-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "businessName" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxNumber" TEXT,
    "currency" TEXT,
    "currencySymbol" TEXT,
    "paymentQrUrl" TEXT,
    "invoicePrefix" TEXT,
    "invoiceFooter" TEXT,
    "lowStockThreshold" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConfig_sheetConnectionId_key" ON "BusinessConfig"("sheetConnectionId");

-- CreateIndex
CREATE INDEX "BusinessConfig_sheetConnectionId_idx" ON "BusinessConfig"("sheetConnectionId");

-- CreateIndex
CREATE INDEX "BusinessConfig_syncStatus_idx" ON "BusinessConfig"("syncStatus");

-- AddForeignKey
ALTER TABLE "BusinessConfig" ADD CONSTRAINT "BusinessConfig_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
