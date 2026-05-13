-- CreateTable
CREATE TABLE "BusinessOrder" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variation" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentPhone" TEXT,
    "courierName" TEXT,
    "trackingCode" TEXT,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "BusinessDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessReturn" (
    "id" TEXT NOT NULL,
    "sheetConnectionId" TEXT NOT NULL,
    "externalSheetId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "returnType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "saleId" TEXT,
    "saleInvoice" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "purchaseId" TEXT,
    "purchaseInvoice" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,

    CONSTRAINT "BusinessReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL DEFAULT 'DAMAGED',

    CONSTRAINT "BusinessReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessOrder_sheetConnectionId_externalSheetId_idx" ON "BusinessOrder"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessOrder_status_idx" ON "BusinessOrder"("status");

-- CreateIndex
CREATE INDEX "BusinessOrder_syncStatus_idx" ON "BusinessOrder"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessOrder_sheetConnectionId_id_key" ON "BusinessOrder"("sheetConnectionId", "id");

-- CreateIndex
CREATE INDEX "BusinessOrderItem_orderId_idx" ON "BusinessOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDelivery_orderId_key" ON "BusinessDelivery"("orderId");

-- CreateIndex
CREATE INDEX "BusinessDelivery_orderId_idx" ON "BusinessDelivery"("orderId");

-- CreateIndex
CREATE INDEX "BusinessReturn_sheetConnectionId_externalSheetId_idx" ON "BusinessReturn"("sheetConnectionId", "externalSheetId");

-- CreateIndex
CREATE INDEX "BusinessReturn_returnType_idx" ON "BusinessReturn"("returnType");

-- CreateIndex
CREATE INDEX "BusinessReturn_status_idx" ON "BusinessReturn"("status");

-- CreateIndex
CREATE INDEX "BusinessReturn_syncStatus_idx" ON "BusinessReturn"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessReturn_sheetConnectionId_id_key" ON "BusinessReturn"("sheetConnectionId", "id");

-- CreateIndex
CREATE INDEX "BusinessReturnItem_returnId_idx" ON "BusinessReturnItem"("returnId");

-- AddForeignKey
ALTER TABLE "BusinessOrder" ADD CONSTRAINT "BusinessOrder_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessOrderItem" ADD CONSTRAINT "BusinessOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDelivery" ADD CONSTRAINT "BusinessDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BusinessOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReturn" ADD CONSTRAINT "BusinessReturn_sheetConnectionId_fkey" FOREIGN KEY ("sheetConnectionId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReturnItem" ADD CONSTRAINT "BusinessReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "BusinessReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
