-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL', 'LIFETIME');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ESEWA_QR', 'KHALTI', 'BANK_TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('AWAITING_PAYMENT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- AlterTable
ALTER TABLE "Tier" ADD COLUMN     "annualPrice" DOUBLE PRECISION,
ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ALTER COLUMN "currency" SET DEFAULT 'NPR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedTierId" TEXT NOT NULL,
    "requestedBillingCycle" "BillingCycle" NOT NULL,
    "requestedTierName" TEXT NOT NULL,
    "amountSnapshot" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ESEWA_QR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "screenshotUrl" TEXT,
    "transactionReference" TEXT,
    "payerAccount" TEXT,
    "userNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "approvedByAdminId" TEXT,
    "rejectedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL,
    "esewaId" TEXT NOT NULL,
    "esewaName" TEXT NOT NULL,
    "esewaPhone" TEXT,
    "qrCodeData" TEXT NOT NULL,
    "qrImageUrl" TEXT,
    "instructions" TEXT NOT NULL DEFAULT '1. Scan QR or send to eSewa ID
2. Enter exact amount
3. Copy Invoice ID to remarks
4. Upload payment screenshot',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_invoiceId_key" ON "PaymentRequest"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentRequest_userId_status_idx" ON "PaymentRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_createdAt_idx" ON "PaymentRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentRequest_invoiceId_idx" ON "PaymentRequest"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentSettings_isActive_idx" ON "PaymentSettings"("isActive");

-- CreateIndex
CREATE INDEX "User_subscriptionStatus_subscriptionExpiresAt_idx" ON "User"("subscriptionStatus", "subscriptionExpiresAt");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requestedTierId_fkey" FOREIGN KEY ("requestedTierId") REFERENCES "Tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_rejectedByAdminId_fkey" FOREIGN KEY ("rejectedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
