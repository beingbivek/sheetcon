-- AlterTable
ALTER TABLE "BusinessConfig" ADD COLUMN     "defaultTaxRate" TEXT;

-- AlterTable
ALTER TABLE "BusinessProduct" ADD COLUMN     "pricedWithTax" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BusinessSale" ADD COLUMN     "saleType" TEXT NOT NULL DEFAULT 'WALK_IN';
