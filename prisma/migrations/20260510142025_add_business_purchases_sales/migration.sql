-- CreateTable
CREATE TABLE "BusinessPurchase" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "landedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSale" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variation" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessPurchase_sheetConnectionId_externalSheetId_idx" ON "BusinessPurchase"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessPurchase_syncStatus_idx" ON "BusinessPurchase"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPurchase_sheetConnectionId_id_key" ON "BusinessPurchase"("sheetConnectionId", "id");

-- CreateIndex
CREATE INDEX "BusinessPurchaseItem_purchaseId_idx" ON "BusinessPurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "BusinessSale_sheetConnectionId_externalSheetId_idx" ON "BusinessSale"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessSale_syncStatus_idx" ON "BusinessSale"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSale_sheetConnectionId_id_key" ON "BusinessSale"("sheetConnectionId", "id");

-- CreateIndex
CREATE INDEX "BusinessSaleItem_saleId_idx" ON "BusinessSaleItem"("saleId");

-- AddForeignKey
ALTER TABLE "BusinessPurchase" ADD CONSTRAINT "BusinessPurchase_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPurchaseItem" ADD CONSTRAINT "BusinessPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "BusinessPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSale" ADD CONSTRAINT "BusinessSale_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSaleItem" ADD CONSTRAINT "BusinessSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "BusinessSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
