// lib/google-sheet-business.ts
// In getConfig(), REPLACE both return blocks (dbConfig branch and imported branch)
// to add defaultTaxRate. Find the pattern:
//   lowStockThreshold: dbConfig.lowStockThreshold ?? "",
// and add after it:
//   defaultTaxRate: dbConfig.defaultTaxRate ?? "",

// Do this in ALL 4 places that build the config return object:
// 1. dbConfig branch
// 2. imported branch
// 3. updateConfig create branch return
// 4. updateConfig update branch return

// lib/google-sheet-business.ts (COMPLETE REPLACEMENT)

import { getOAuth2Client } from "@/lib/google-sheet";
import { queueReadRequest, queueWriteRequest } from "@/lib/google-sheets-queue";
import { prisma } from "@/lib/db";
import {
  enqueueProductSync,
  enqueueProductDeleteSync,
  importProductsFromSheet,
  enqueueSupplierSync, // ADD
  enqueueSupplierDeleteSync, // ADD
  importSuppliersFromSheet,
  enqueueCustomerSync, // ADD
  enqueueCustomerDeleteSync, // ADD
  importCustomersFromSheet,
  enqueuePurchaseSync, // ADD
  enqueuePurchaseDeleteSync, // ADD
  importPurchasesFromSheet, // ADD
  enqueueSaleSync, // ADD
  enqueueSaleDeleteSync, // ADD
  importSalesFromSheet,
  importConfigFromSheet, // ADD
  enqueueConfigSync,
  enqueueOrderSync,
  enqueueOrderDeleteSync,
  importOrdersFromSheet,
  enqueueReturnSync,
  importReturnsFromSheet,
} from "@/lib/db-sync";
import {
  getOrFetch,
  invalidateSpreadsheetCache,
  getCacheKey,
  CACHE_PREFIX,
  CACHE_TTL,
} from "@/lib/cache";
import { google } from "googleapis";

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

export const TABS = {
  CONFIG: "_Config",
  SUPPLIERS: "Suppliers",
  PRODUCTS: "Products",
  CUSTOMERS: "Customers",
  PURCHASES: "Purchases",
  PURCHASE_ITEMS: "PurchaseItems",
  SALES: "Sales",
  SALE_ITEMS: "SaleItems",
  ORDERS: "Orders",
  ORDER_ITEMS: "OrderItems",
  DELIVERIES: "Deliveries",
  RETURNS: "Returns",
  RETURN_ITEMS: "ReturnItems",
} as const;

export const HEADERS = {
  CONFIG: ["key", "value"] as const,
  SUPPLIERS: [
    "id",
    "name",
    "phone",
    "email",
    "address",
    "city",
    "contactPerson",
    "paymentTerms",
    "notes",
    "createdAt",
  ] as const,
  PRODUCTS: [
    "id",
    "name",
    "variation",
    "sku",
    "category",
    "description",
    "costPrice",
    "sellingPrice",
    "stock",
    "minStock",
    "unit",
    "supplierId",
    "supplierName",
    "imageUrl",
    "pricedWithTax",
    "createdAt",
    "updatedAt",
  ] as const,
  CUSTOMERS: [
    "id",
    "name",
    "phone",
    "email",
    "address",
    "city",
    "customerType",
    "notes",
    "createdAt",
  ] as const,
  PURCHASES: [
    "id",
    "invoiceNumber",
    "date",
    "supplierId",
    "supplierName",
    "subtotal",
    "taxPercent",
    "taxAmount",
    "transportCost",
    "customsCost",
    "storageCost",
    "otherExpenses",
    "landedCost",
    "total",
    "amountPaid",
    "amountDue",
    "status",
    "imageUrl",
    "notes",
    "createdAt",
  ] as const,
  PURCHASE_ITEMS: [
    "id",
    "purchaseId",
    "productId",
    "productName",
    "quantity",
    "unitPrice",
    "total",
  ] as const,
  SALES: [
    "id",
    "invoiceNumber",
    "date",
    "customerId",
    "customerName",
    "subtotal",
    "discountType",
    "discountValue",
    "discountAmount",
    "taxPercent",
    "taxAmount",
    "total",
    "amountPaid",
    "amountDue",
    "paymentMethod",
    "status",
    "saleType", // ← NEW col 17
    "notes", // ← shifted to 18
    "createdAt", // ← shifted to 19
  ] as const,
  SALE_ITEMS: [
    "id",
    "saleId",
    "productId",
    "productName",
    "variation",
    "quantity",
    "unitPrice",
    "total",
  ] as const,
  ORDERS: [
    "id",
    "orderNumber",
    "date",
    "customerId",
    "customerName",
    "customerPhone",
    "customerAddress",
    "subtotal",
    "deliveryFee",
    "discountAmount",
    "total",
    "amountPaid",
    "amountDue",
    "paymentMethod",
    "paymentStatus",
    "status",
    "notes",
    "confirmedAt",
    "packedAt",
    "dispatchedAt",
    "deliveredAt",
    "cancelledAt",
    "returnedAt",
    "createdAt",
  ] as const,
  ORDER_ITEMS: [
    "id",
    "orderId",
    "productId",
    "productName",
    "variation",
    "quantity",
    "unitPrice",
    "total",
  ] as const,
  DELIVERIES: [
    "id",
    "orderId",
    "agentType",
    "agentName",
    "agentPhone",
    "courierName",
    "trackingCode",
    "deliveryFee",
    "notes",
    "assignedAt",
    "deliveredAt",
  ] as const,
  RETURNS: [
    "id",
    "returnNumber",
    "returnType",
    "date",
    "saleId",
    "saleInvoice",
    "customerId",
    "customerName",
    "purchaseId",
    "purchaseInvoice",
    "supplierId",
    "supplierName",
    "reason",
    "notes",
    "status",
    "totalValue",
    "refundAmount",
    "refundMethod",
    "createdAt",
  ] as const,
  RETURN_ITEMS: [
    "id",
    "returnId",
    "productId",
    "productName",
    "quantity",
    "unitPrice",
    "total",
    "condition",
  ] as const,
} as const;

const RANGES = {
  CONFIG: `${TABS.CONFIG}!A2:B`,
  SUPPLIERS: `${TABS.SUPPLIERS}!A2:J`,
  PRODUCTS: `${TABS.PRODUCTS}!A2:Q`,
  CUSTOMERS: `${TABS.CUSTOMERS}!A2:I`,
  PURCHASES: `${TABS.PURCHASES}!A2:T`,
  PURCHASE_ITEMS: `${TABS.PURCHASE_ITEMS}!A2:G`,
  SALES: `${TABS.SALES}!A2:T`,
  SALE_ITEMS: `${TABS.SALE_ITEMS}!A2:H`,
  ORDERS: `${TABS.ORDERS}!A2:X`,
  ORDER_ITEMS: `${TABS.ORDER_ITEMS}!A2:H`,
  DELIVERIES: `${TABS.DELIVERIES}!A2:K`,
  RETURNS: `${TABS.RETURNS}!A2:S`,
  RETURN_ITEMS: `${TABS.RETURN_ITEMS}!A2:H`,
} as const;

const NUMERIC_FIELDS = new Set([
  "costPrice",
  "sellingPrice",
  "stock",
  "minStock",
  "subtotal",
  "taxPercent",
  "taxAmount",
  "total",
  "amountPaid",
  "amountDue",
  "quantity",
  "unitPrice",
  "discountValue",
  "discountAmount",
  "transportCost",
  "customsCost",
  "storageCost",
  "otherExpenses",
  "landedCost",
]);

const DATE_FIELDS = new Set(["createdAt", "updatedAt", "date"]);

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

// ── async: must await getOAuth2Client ──────────────
async function makeSheetClient(userId: string) {
  const auth = await getOAuth2Client(userId);
  return google.sheets({ version: "v4", auth });
}

function sheetRowsToObjects(
  data: string[][] | null | undefined,
  headers: readonly string[],
): Record<string, any>[] {
  if (!data || data.length === 0) return [];

  // Special handling for _Config tab (key/value pairs, no id)
  const isKeyValueTable = headers[0] === "key" && headers[1] === "value";

  return data
    .filter((row) => row.some((cell) => cell !== "" && cell != null))
    .map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((header, i) => {
        const raw = row[i] ?? "";
        if (NUMERIC_FIELDS.has(header)) {
          obj[header] = raw === "" ? 0 : parseFloat(String(raw)) || 0;
        } else if (DATE_FIELDS.has(header)) {
          if (raw === "") {
            obj[header] = null;
          } else {
            const d = new Date(raw);
            obj[header] = isNaN(d.getTime()) ? raw : d.toISOString();
          }
        } else {
          obj[header] = raw === "" ? null : raw;
        }
      });
      return obj;
    })
    .filter((obj) => {
      // For key/value tables, filter by key not id
      if (isKeyValueTable) {
        return obj.key != null && obj.key !== "";
      }
      // For regular tables, filter by id
      return obj.id != null && obj.id !== "";
    });
}

function objectsToSheetRows(
  objects: Record<string, any>[],
  headers: readonly string[],
): string[][] {
  return objects.map((obj) =>
    headers.map((h) => {
      const val = obj[h];
      if (val == null) return "";
      if (val instanceof Date) return val.toISOString();
      return String(val);
    }),
  );
}

function generateId(
  prefix: string,
  existing: Record<string, any>[],
  connectionId?: string,
): string {
  const suffix = connectionId ? `_${connectionId.slice(-8)}` : "";
  if (existing.length === 0) return `${prefix}${suffix}_1`;
  const nums = existing
    .map((r) => {
      const match = String(r.id ?? "").match(/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${suffix}_${max + 1}`;
}

function generateInvoiceNumber(
  prefix: string,
  existing: Record<string, any>[],
): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const count = existing.length + 1;
  return `${prefix}-${ymd}-${String(count).padStart(4, "0")}`;
}

function padValues(
  values: string[][],
  colCount: number,
  originalLength: number,
): string[][] {
  const emptyRow = Array<string>(colCount).fill("");
  const result = [...values];
  while (result.length < originalLength) {
    result.push(emptyRow);
  }
  return result;
}

// ═══════════════════════════════════════════════════
// SPREADSHEET CREATION
// ═══════════════════════════════════════════════════

export async function createBusinessManagementSpreadsheet(
  userId: string,
  title: string,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);

    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          { properties: { title: TABS.CONFIG, index: 0 } },
          { properties: { title: TABS.SUPPLIERS, index: 1 } },
          { properties: { title: TABS.PRODUCTS, index: 2 } },
          { properties: { title: TABS.CUSTOMERS, index: 3 } },
          { properties: { title: TABS.PURCHASES, index: 4 } },
          { properties: { title: TABS.PURCHASE_ITEMS, index: 5 } },
          { properties: { title: TABS.SALES, index: 6 } },
          { properties: { title: TABS.SALE_ITEMS, index: 7 } },
          { properties: { title: TABS.ORDERS, index: 8 } },
          { properties: { title: TABS.ORDER_ITEMS, index: 9 } },
          { properties: { title: TABS.DELIVERIES, index: 10 } },
          { properties: { title: TABS.RETURNS, index: 11 } },
          { properties: { title: TABS.RETURN_ITEMS, index: 12 } },
        ],
      },
    });

    const spreadsheetId = created.data.spreadsheetId!;
    const sheetMeta = created.data.sheets || [];

    const getSheetId = (tabName: string): number => {
      const found = sheetMeta.find((s) => s.properties?.title === tabName);
      return found?.properties?.sheetId ?? 0;
    };

    const headerEntries: { tab: string; headers: readonly string[] }[] = [
      { tab: TABS.CONFIG, headers: HEADERS.CONFIG },
      { tab: TABS.SUPPLIERS, headers: HEADERS.SUPPLIERS },
      { tab: TABS.PRODUCTS, headers: HEADERS.PRODUCTS },
      { tab: TABS.CUSTOMERS, headers: HEADERS.CUSTOMERS },
      { tab: TABS.PURCHASES, headers: HEADERS.PURCHASES },
      { tab: TABS.PURCHASE_ITEMS, headers: HEADERS.PURCHASE_ITEMS },
      { tab: TABS.SALES, headers: HEADERS.SALES },
      { tab: TABS.SALE_ITEMS, headers: HEADERS.SALE_ITEMS },
      { tab: TABS.ORDERS, headers: HEADERS.ORDERS },
      { tab: TABS.ORDER_ITEMS, headers: HEADERS.ORDER_ITEMS },
      { tab: TABS.DELIVERIES, headers: HEADERS.DELIVERIES },
      { tab: TABS.RETURNS, headers: HEADERS.RETURNS },
      { tab: TABS.RETURN_ITEMS, headers: HEADERS.RETURN_ITEMS },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: headerEntries.map(({ tab, headers }) => ({
          range: `${tab}!A1:${String.fromCharCode(64 + headers.length)}1`,
          values: [Array.from(headers)],
        })),
      },
    });

    const formatRequests = headerEntries.map(({ tab, headers }) => ({
      repeatCell: {
        range: {
          sheetId: getSheetId(tab),
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.149, green: 0.267, blue: 0.545 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    }));

    const freezeRequests = headerEntries.map(({ tab }) => ({
      updateSheetProperties: {
        properties: {
          sheetId: getSheetId(tab),
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [...formatRequests, ...freezeRequests] },
    });

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  });
}

export async function initializeExistingBusinessSheet(
  userId: string,
  spreadsheetId: string,
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = new Set(
      meta.data.sheets?.map((s) => s.properties?.title ?? "") ?? [],
    );

    const addSheetRequests = Object.values(TABS)
      .filter((tab) => !existingTitles.has(tab))
      .map((tab, i) => ({
        addSheet: {
          properties: { title: tab, index: existingTitles.size + i },
        },
      }));

    if (addSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: addSheetRequests },
      });
    }

    const headerEntries = [
      { tab: TABS.CONFIG, headers: HEADERS.CONFIG },
      { tab: TABS.SUPPLIERS, headers: HEADERS.SUPPLIERS },
      { tab: TABS.PRODUCTS, headers: HEADERS.PRODUCTS },
      { tab: TABS.CUSTOMERS, headers: HEADERS.CUSTOMERS },
      { tab: TABS.PURCHASES, headers: HEADERS.PURCHASES },
      { tab: TABS.PURCHASE_ITEMS, headers: HEADERS.PURCHASE_ITEMS },
      { tab: TABS.SALES, headers: HEADERS.SALES },
      { tab: TABS.SALE_ITEMS, headers: HEADERS.SALE_ITEMS },
      { tab: TABS.ORDERS, headers: HEADERS.ORDERS },
      { tab: TABS.ORDER_ITEMS, headers: HEADERS.ORDER_ITEMS },
      { tab: TABS.DELIVERIES, headers: HEADERS.DELIVERIES },
      { tab: TABS.RETURNS, headers: HEADERS.RETURNS },
      { tab: TABS.RETURN_ITEMS, headers: HEADERS.RETURN_ITEMS },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: headerEntries.map(({ tab, headers }) => ({
          range: `${tab}!A1:${String.fromCharCode(64 + headers.length)}1`,
          values: [Array.from(headers)],
        })),
      },
    });
  });
}

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════
export async function getConfig(
  userId: string,
  spreadsheetId: string,
): Promise<Record<string, string>> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.METADATA,
    spreadsheetId,
    "biz-config",
  );

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (connection) {
        const dbConfig = await prisma.businessConfig.findUnique({
          where: { sheetConnectionId: connection.id },
        });

        if (dbConfig) {
          return {
            businessName: dbConfig.businessName ?? "",
            logoUrl: dbConfig.logoUrl ?? "",
            address: dbConfig.address ?? "",
            phone: dbConfig.phone ?? "",
            email: dbConfig.email ?? "",
            website: dbConfig.website ?? "",
            taxNumber: dbConfig.taxNumber ?? "",
            currency: dbConfig.currency ?? "",
            currencySymbol: dbConfig.currencySymbol ?? "",
            paymentQrUrl: dbConfig.paymentQrUrl ?? "",
            invoicePrefix: dbConfig.invoicePrefix ?? "",
            invoiceFooter: dbConfig.invoiceFooter ?? "",
            lowStockThreshold: dbConfig.lowStockThreshold ?? "",
            defaultTaxRate: dbConfig.defaultTaxRate ?? "0", // ← NEW
          };
        }

        await importConfigFromSheet(userId, connection.id, spreadsheetId);
        const imported = await prisma.businessConfig.findUnique({
          where: { sheetConnectionId: connection.id },
        });

        if (imported) {
          return {
            businessName: imported.businessName ?? "",
            logoUrl: imported.logoUrl ?? "",
            address: imported.address ?? "",
            phone: imported.phone ?? "",
            email: imported.email ?? "",
            website: imported.website ?? "",
            taxNumber: imported.taxNumber ?? "",
            currency: imported.currency ?? "",
            currencySymbol: imported.currencySymbol ?? "",
            paymentQrUrl: imported.paymentQrUrl ?? "",
            invoicePrefix: imported.invoicePrefix ?? "",
            invoiceFooter: imported.invoiceFooter ?? "",
            lowStockThreshold: imported.lowStockThreshold ?? "",
            defaultTaxRate: imported.defaultTaxRate ?? "0", // ← NEW
          };
        }
      }

      // Fallback: direct sheet read
      const data = await queueReadRequest(userId, async () => {
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.CONFIG,
        });
        return res.data.values as string[][];
      });
      const rows = sheetRowsToObjects(data, HEADERS.CONFIG);
      return Object.fromEntries(
        rows
          .filter((r) => r.key != null && r.key !== "")
          .map((r) => [String(r.key), String(r.value ?? "")]),
      );
    },
    CACHE_TTL.METADATA,
  );
}

export async function updateConfig(
  userId: string,
  spreadsheetId: string,
  updates: Record<string, string>,
): Promise<Record<string, string>> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CONFIG,
      });
      const rows = sheetRowsToObjects(
        existing.data.values as string[][] | null,
        HEADERS.CONFIG,
      );
      const configMap: Record<string, string> = Object.fromEntries(
        rows
          .filter((r) => r.key)
          .map((r) => [String(r.key), String(r.value ?? "")]),
      );
      Object.assign(configMap, updates);
      const values = Object.entries(configMap).map(([k, v]) => [k, v]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.CONFIG}!A2:B`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return configMap;
    });
  }

  const existing = await prisma.businessConfig.findUnique({
    where: { sheetConnectionId: connection.id },
  });

  if (!existing) {
    await prisma.businessConfig.create({
      data: {
        sheetConnectionId: connection.id,
        externalSheetId: spreadsheetId,
        businessName: updates.businessName ?? null,
        logoUrl: updates.logoUrl ?? null,
        address: updates.address ?? null,
        phone: updates.phone ?? null,
        email: updates.email ?? null,
        website: updates.website ?? null,
        taxNumber: updates.taxNumber ?? null,
        currency: updates.currency ?? null,
        currencySymbol: updates.currencySymbol ?? null,
        paymentQrUrl: updates.paymentQrUrl ?? null,
        invoicePrefix: updates.invoicePrefix ?? null,
        invoiceFooter: updates.invoiceFooter ?? null,
        lowStockThreshold: updates.lowStockThreshold ?? null,
        defaultTaxRate: updates.defaultTaxRate ?? null, // ← NEW
        syncStatus: "PENDING",
      },
    });
  } else {
    await prisma.businessConfig.update({
      where: { sheetConnectionId: connection.id },
      data: {
        businessName: updates.businessName ?? existing.businessName,
        logoUrl: updates.logoUrl ?? existing.logoUrl,
        address: updates.address ?? existing.address,
        phone: updates.phone ?? existing.phone,
        email: updates.email ?? existing.email,
        website: updates.website ?? existing.website,
        taxNumber: updates.taxNumber ?? existing.taxNumber,
        currency: updates.currency ?? existing.currency,
        currencySymbol: updates.currencySymbol ?? existing.currencySymbol,
        paymentQrUrl: updates.paymentQrUrl ?? existing.paymentQrUrl,
        invoicePrefix: updates.invoicePrefix ?? existing.invoicePrefix,
        invoiceFooter: updates.invoiceFooter ?? existing.invoiceFooter,
        lowStockThreshold:
          updates.lowStockThreshold ?? existing.lowStockThreshold,
        defaultTaxRate: updates.defaultTaxRate ?? existing.defaultTaxRate, // ← NEW
        updatedAt: new Date(),
        syncStatus: "PENDING",
        lastSyncedAt: null,
      },
    });
  }

  enqueueConfigSync(userId, spreadsheetId);
  await invalidateSpreadsheetCache(spreadsheetId);

  const updated = await prisma.businessConfig.findUnique({
    where: { sheetConnectionId: connection.id },
  });

  return {
    businessName: updated?.businessName ?? "",
    logoUrl: updated?.logoUrl ?? "",
    address: updated?.address ?? "",
    phone: updated?.phone ?? "",
    email: updated?.email ?? "",
    website: updated?.website ?? "",
    taxNumber: updated?.taxNumber ?? "",
    currency: updated?.currency ?? "",
    currencySymbol: updated?.currencySymbol ?? "",
    paymentQrUrl: updated?.paymentQrUrl ?? "",
    invoicePrefix: updated?.invoicePrefix ?? "",
    invoiceFooter: updated?.invoiceFooter ?? "",
    lowStockThreshold: updated?.lowStockThreshold ?? "",
    defaultTaxRate: updated?.defaultTaxRate ?? "0", // ← NEW
  };
}

export async function readConfigFresh(
  userId: string,
  spreadsheetId: string,
): Promise<Record<string, string>> {
  const data = await queueReadRequest(userId, async () => {
    const sheets = await makeSheetClient(userId);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGES.CONFIG,
    });
    return res.data.values as string[][];
  });
  const rows = sheetRowsToObjects(data, HEADERS.CONFIG);
  return Object.fromEntries(
    rows
      .filter((r) => r.key != null && r.key !== "")
      .map((r) => [String(r.key), String(r.value ?? "")]),
  );
}

// ═══════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: string;
}

// lib/google-sheet-business.ts
// REPLACE: getSuppliers, createSupplier, updateSupplier, deleteSupplier

function dbRowToSupplier(r: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: Date;
}): Supplier {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    city: r.city,
    contactPerson: r.contactPerson,
    paymentTerms: r.paymentTerms,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getSuppliers(
  userId: string,
  spreadsheetId: string,
): Promise<Supplier[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.CUSTOMERS,
    spreadsheetId,
    "biz-suppliers",
  );

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (connection) {
        const dbRows = await prisma.businessSupplier.findMany({
          where: {
            sheetConnectionId: connection.id,
            externalSheetId: spreadsheetId,
          },
          orderBy: { createdAt: "asc" },
        });
        return dbRows.map(dbRowToSupplier);
      }

      // Fallback: direct sheet read
      const data = await queueReadRequest(userId, async () => {
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.SUPPLIERS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.SUPPLIERS) as Supplier[];
    },
    CACHE_TTL.CUSTOMERS,
  );
}

export async function createSupplier(
  userId: string,
  spreadsheetId: string,
  input: Omit<Supplier, "id" | "createdAt">,
): Promise<Supplier> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.SUPPLIERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.SUPPLIERS,
      ) as Supplier[];
      const newSupplier: Supplier = {
        id: generateId("SUP", all),
        createdAt: new Date().toISOString(),
        ...input,
      };
      const values = objectsToSheetRows([newSupplier], HEADERS.SUPPLIERS);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.SUPPLIERS}!A:J`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return newSupplier;
    });
  }

  // DB-first
  const allSuppliers = await prisma.businessSupplier.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const nextId = generateId("SUP", allSuppliers, connection.id);

  const created = await prisma.businessSupplier.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      city: input.city,
      contactPerson: input.contactPerson,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      createdAt: new Date(),
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
  });

  enqueueSupplierSync(userId, spreadsheetId, created.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToSupplier(created);
}

export async function updateSupplier(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
  updates: Partial<Omit<Supplier, "id" | "createdAt">>,
): Promise<Supplier> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.SUPPLIERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.SUPPLIERS,
      ) as Supplier[];
      const idx = all.findIndex((s) => s.id === supplierId);
      if (idx === -1) throw new Error("Supplier not found");
      all[idx] = { ...all[idx], ...updates };
      const values = objectsToSheetRows(all, HEADERS.SUPPLIERS);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SUPPLIERS}!A2:J`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return all[idx];
    });
  }

  const updated = await prisma.businessSupplier.update({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: supplierId,
      },
    },
    data: {
      ...updates,
      updatedAt: new Date(),
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
  });

  enqueueSupplierSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToSupplier(updated);
}

export async function deleteSupplier(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.SUPPLIERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.SUPPLIERS,
      ) as Supplier[];
      const filtered = all.filter((s) => s.id !== supplierId);
      if (filtered.length === all.length) throw new Error("Supplier not found");
      const values = objectsToSheetRows(filtered, HEADERS.SUPPLIERS);
      const padded = padValues(values, HEADERS.SUPPLIERS.length, all.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SUPPLIERS}!A2:J`,
        valueInputOption: "RAW",
        requestBody: { values: padded },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
    });
  }

  await prisma.businessSupplier.delete({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: supplierId,
      },
    },
  });

  enqueueSupplierDeleteSync(userId, spreadsheetId, supplierId);
  await invalidateSpreadsheetCache(spreadsheetId);
}

// ═══════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════

export interface Product {
  id: string;
  name: string;
  variation: string | null;
  sku: string | null;
  category: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string | null;
  supplierId: string | null;
  supplierName: string | null;
  imageUrl: string | null;
  pricedWithTax: boolean; // ← NEW
  createdAt: string;
  updatedAt: string;
}

export async function getProducts(
  userId: string,
  spreadsheetId: string,
): Promise<Product[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.PRODUCTS,
    spreadsheetId,
    "biz-products",
  );

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (!connection) throw new Error("Connection not found");

      // No connection record — fallback to direct sheet read
      const data = await queueReadRequest(userId, async () => {
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.PRODUCTS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.PRODUCTS) as Product[];
    },
    CACHE_TTL.PRODUCTS,
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export async function createProduct(
  userId: string,
  spreadsheetId: string,
  input: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Promise<Product> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    // Fallback: direct sheet write (old behavior)
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.PRODUCTS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.PRODUCTS,
      ) as Product[];
      const now = new Date().toISOString();
      const newProduct: Product = {
        id: generateId("PROD", all),
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      const values = objectsToSheetRows([newProduct], HEADERS.PRODUCTS);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.PRODUCTS}!A:Q`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return newProduct;
    });
  }

  // ✅ DB-first write
  // Generate ID matching sheet pattern (PROD_N) to stay compatible
  const allProducts = await prisma.businessProduct.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const nextId = generateId("PROD", allProducts, connection.id);

  const now = new Date();
  const created = await prisma.businessProduct.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      name: input.name,
      variation: input.variation,
      sku: input.sku,
      category: input.category,
      description: input.description,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      stock: input.stock,
      minStock: input.minStock,
      unit: input.unit,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      imageUrl: input.imageUrl,
      pricedWithTax: input.pricedWithTax,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      syncStatus: "PENDING",
    },
  });

  // Non-blocking sheet sync
  enqueueProductSync(userId, spreadsheetId, created.id);
  await invalidateSpreadsheetCache(spreadsheetId);

  return dbRowToProduct(created);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function updateProduct(
  userId: string,
  spreadsheetId: string,
  productId: string,
  updates: Partial<Omit<Product, "id" | "createdAt">>,
): Promise<Product> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.PRODUCTS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.PRODUCTS,
      ) as Product[];
      const idx = all.findIndex((p) => p.id === productId);
      if (idx === -1) throw new Error("Product not found");
      all[idx] = {
        ...all[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      const values = objectsToSheetRows(all, HEADERS.PRODUCTS);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.PRODUCTS}!A2:Q`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return all[idx];
    });
  }

  // ✅ DB-first update
  const updated = await prisma.businessProduct.update({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: productId,
      },
    },
    data: {
      ...updates,
      updatedAt: new Date(),
      lastSyncedAt: null,
      syncStatus: "PENDING",
    },
  });

  enqueueProductSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);

  return dbRowToProduct(updated);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProduct(
  userId: string,
  spreadsheetId: string,
  productId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.PRODUCTS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.PRODUCTS,
      ) as Product[];
      const filtered = all.filter((p) => p.id !== productId);
      if (filtered.length === all.length) throw new Error("Product not found");
      const values = objectsToSheetRows(filtered, HEADERS.PRODUCTS);
      const padded = padValues(values, HEADERS.PRODUCTS.length, all.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.PRODUCTS}!A2:Q`,
        valueInputOption: "RAW",
        requestBody: { values: padded },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
    });
  }

  // ✅ DB-first delete
  await prisma.businessProduct.delete({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: productId,
      },
    },
  });

  // Non-blocking sheet sync
  enqueueProductDeleteSync(userId, spreadsheetId, productId);
  await invalidateSpreadsheetCache(spreadsheetId);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE mapper (add once, near top of product section)
// ─────────────────────────────────────────────────────────────────────────────

function dbRowToProduct(r: {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string | null;
  supplierId: string | null;
  supplierName: string | null;
  imageUrl: string | null;
  pricedWithTax: boolean; // ← NEW
  variation: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  return {
    id: r.id,
    name: r.name,
    variation: r.variation,
    sku: r.sku,
    category: r.category,
    description: r.description,
    costPrice: r.costPrice,
    sellingPrice: r.sellingPrice,
    stock: r.stock,
    minStock: r.minStock,
    unit: r.unit,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    imageUrl: r.imageUrl,
    pricedWithTax: r.pricedWithTax, // ← NEW
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ─── Internal: deduct stock (called inside queueWriteRequest) ─────────────────

async function _rawDeductStock(
  userId: string,
  spreadsheetId: string,
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  // ── await makeSheetClient ──
  const sheets = await makeSheetClient(userId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });
  const all = sheetRowsToObjects(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS,
  ) as Product[];

  for (const item of items) {
    const idx = all.findIndex((p) => p.id === item.productId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        stock: Math.max(0, all[idx].stock - item.quantity),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const values = objectsToSheetRows(all, HEADERS.PRODUCTS);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.PRODUCTS}!A2:O`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

async function _rawRestoreStock(
  userId: string,
  spreadsheetId: string,
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  // ── await makeSheetClient ──
  const sheets = await makeSheetClient(userId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });
  const all = sheetRowsToObjects(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS,
  ) as Product[];

  for (const item of items) {
    const idx = all.findIndex((p) => p.id === item.productId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        stock: all[idx].stock + item.quantity,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const values = objectsToSheetRows(all, HEADERS.PRODUCTS);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.PRODUCTS}!A2:O`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// ═══════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customerType: "WALK_IN" | "ONLINE";
  notes: string | null;
  createdAt: string;
}

function dbRowToCustomer(r: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customerType: string;
  notes: string | null;
  createdAt: Date;
}): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    city: r.city,
    customerType: r.customerType as "WALK_IN" | "ONLINE",
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getCustomers(
  userId: string,
  spreadsheetId: string,
): Promise<Customer[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.CUSTOMERS,
    spreadsheetId,
    "biz-customers",
  );

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (connection) {
        const dbRows = await prisma.businessCustomer.findMany({
          where: {
            sheetConnectionId: connection.id,
            externalSheetId: spreadsheetId,
          },
          orderBy: { createdAt: "asc" },
        });
        return dbRows.map(dbRowToCustomer);
      }

      const data = await queueReadRequest(userId, async () => {
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.CUSTOMERS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.CUSTOMERS) as Customer[];
    },
    CACHE_TTL.CUSTOMERS,
  );
}

export async function createCustomer(
  userId: string,
  spreadsheetId: string,
  input: Omit<Customer, "id" | "createdAt">,
): Promise<Customer> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CUSTOMERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.CUSTOMERS,
      ) as Customer[];
      const newCustomer: Customer = {
        id: generateId("CUST", all),
        createdAt: new Date().toISOString(),
        ...input,
      };
      const values = objectsToSheetRows([newCustomer], HEADERS.CUSTOMERS);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.CUSTOMERS}!A:I`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return newCustomer;
    });
  }

  const allCustomers = await prisma.businessCustomer.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const nextId = generateId("CUST", allCustomers, connection.id);

  const created = await prisma.businessCustomer.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      city: input.city,
      customerType: input.customerType,
      notes: input.notes,
      createdAt: new Date(),
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
  });

  enqueueCustomerSync(userId, spreadsheetId, created.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToCustomer(created);
}

export async function updateCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string,
  updates: Partial<Omit<Customer, "id" | "createdAt">>,
): Promise<Customer> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CUSTOMERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.CUSTOMERS,
      ) as Customer[];
      const idx = all.findIndex((c) => c.id === customerId);
      if (idx === -1) throw new Error("Customer not found");
      all[idx] = { ...all[idx], ...updates };
      const values = objectsToSheetRows(all, HEADERS.CUSTOMERS);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.CUSTOMERS}!A2:I`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return all[idx];
    });
  }

  const updated = await prisma.businessCustomer.update({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: customerId,
      },
    },
    data: {
      ...updates,
      updatedAt: new Date(),
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
  });

  enqueueCustomerSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToCustomer(updated);
}

export async function deleteCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.CUSTOMERS,
      });
      const all = sheetRowsToObjects(
        res.data.values as string[][] | null,
        HEADERS.CUSTOMERS,
      ) as Customer[];
      const filtered = all.filter((c) => c.id !== customerId);
      if (filtered.length === all.length) throw new Error("Customer not found");
      const values = objectsToSheetRows(filtered, HEADERS.CUSTOMERS);
      const padded = padValues(values, HEADERS.CUSTOMERS.length, all.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.CUSTOMERS}!A2:I`,
        valueInputOption: "RAW",
        requestBody: { values: padded },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
    });
  }

  await prisma.businessCustomer.delete({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: customerId,
      },
    },
  });

  enqueueCustomerDeleteSync(userId, spreadsheetId, customerId);
  await invalidateSpreadsheetCache(spreadsheetId);
}

// ═══════════════════════════════════════════════════
// PURCHASES
// ═══════════════════════════════════════════════════

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string | null;
  supplierName: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  transportCost: number;
  customsCost: number;
  storageCost: number;
  otherExpenses: number;
  landedCost: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  items?: PurchaseItem[];
}

function dbRowToPurchase(r: any): Purchase {
  return {
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    date: r.date,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    subtotal: r.subtotal,
    taxPercent: r.taxPercent,
    taxAmount: r.taxAmount,
    transportCost: r.transportCost,
    customsCost: r.customsCost,
    storageCost: r.storageCost,
    otherExpenses: r.otherExpenses,
    landedCost: r.landedCost,
    total: r.total,
    amountPaid: r.amountPaid,
    amountDue: r.amountDue,
    status: r.status as Purchase["status"],
    imageUrl: r.imageUrl,
    notes: r.notes,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    items: r.items?.map((i: any) => ({
      id: i.id,
      purchaseId: i.purchaseId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
  };
}

function dbRowToSale(r: any): Sale {
  return {
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    date: r.date,
    customerId: r.customerId,
    customerName: r.customerName,
    subtotal: r.subtotal,
    discountType: r.discountType as Sale["discountType"],
    discountValue: r.discountValue,
    discountAmount: r.discountAmount,
    taxPercent: r.taxPercent,
    taxAmount: r.taxAmount,
    total: r.total,
    amountPaid: r.amountPaid,
    amountDue: r.amountDue,
    paymentMethod: r.paymentMethod,
    status: r.status as Sale["status"],
    saleType: (r.saleType as Sale["saleType"]) ?? "WALK_IN", // ← NEW
    notes: r.notes,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    items: r.items?.map((i: any) => ({
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      productName: i.productName,
      variation: i.variation,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
  };
}

// ─── PURCHASES ────────────────────────────────────────────────────────────────

export async function getPurchases(
  userId: string,
  spreadsheetId: string,
): Promise<Purchase[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.TRANSACTIONS,
    spreadsheetId,
    "biz-purchases",
  );

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (connection) {
        const dbRows = await prisma.businessPurchase.findMany({
          where: {
            sheetConnectionId: connection.id,
            externalSheetId: spreadsheetId,
          },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        });
        return dbRows.map(dbRowToPurchase);
      }

      // Fallback
      const [purchaseData, itemData] = await queueReadRequest(
        userId,
        async () => {
          const sheets = await makeSheetClient(userId);
          const [pRes, iRes] = await Promise.all([
            sheets.spreadsheets.values.get({
              spreadsheetId,
              range: RANGES.PURCHASES,
            }),
            sheets.spreadsheets.values.get({
              spreadsheetId,
              range: RANGES.PURCHASE_ITEMS,
            }),
          ]);
          return [
            pRes.data.values as string[][],
            iRes.data.values as string[][],
          ];
        },
      );
      const purchases = sheetRowsToObjects(
        purchaseData,
        HEADERS.PURCHASES,
      ) as Purchase[];
      const items = sheetRowsToObjects(
        itemData,
        HEADERS.PURCHASE_ITEMS,
      ) as PurchaseItem[];
      return purchases.map((p) => ({
        ...p,
        items: items.filter((i) => i.purchaseId === p.id),
      }));
    },
    CACHE_TTL.TRANSACTIONS,
  );
}

export async function createPurchase(
  userId: string,
  spreadsheetId: string,
  input: Omit<Purchase, "id" | "invoiceNumber" | "createdAt"> & {
    items: Omit<PurchaseItem, "id" | "purchaseId">[];
  },
): Promise<Purchase> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    // Old fallback
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const pRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.PURCHASES,
      });
      const allPurchases = sheetRowsToObjects(
        pRes.data.values as string[][] | null,
        HEADERS.PURCHASES,
      ) as Purchase[];
      const newPurchase: Purchase = {
        id: generateId("PUR", allPurchases),
        invoiceNumber: generateInvoiceNumber("PUR", allPurchases),
        createdAt: new Date().toISOString(),
        ...input,
        items: undefined,
      };
      const purchaseValues = objectsToSheetRows(
        [newPurchase],
        HEADERS.PURCHASES,
      );
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.PURCHASES}!A:T`,
        valueInputOption: "RAW",
        requestBody: { values: purchaseValues },
      });
      if (input.items?.length > 0) {
        const purchaseItems: PurchaseItem[] = input.items.map((item, i) => ({
          id: `PI_${newPurchase.id}_${i + 1}`,
          purchaseId: newPurchase.id,
          ...item,
        }));
        const itemValues = objectsToSheetRows(
          purchaseItems,
          HEADERS.PURCHASE_ITEMS,
        );
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TABS.PURCHASE_ITEMS}!A:G`,
          valueInputOption: "RAW",
          requestBody: { values: itemValues },
        });
        await _rawRestoreStock(userId, spreadsheetId, purchaseItems);
        newPurchase.items = purchaseItems;
      }
      await invalidateSpreadsheetCache(spreadsheetId);
      return newPurchase;
    });
  }

  // DB-first
  const lastPurchase = await prisma.businessPurchase.findFirst({
    where: { sheetConnectionId: connection.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const nextId = generateId(
    "PUR",
    lastPurchase ? [{ id: lastPurchase.id }] : [],
    connection.id,
  );

  const allPurchases = await prisma.businessPurchase.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const invoiceNumber = generateInvoiceNumber("PUR", allPurchases);

  const now = new Date();
  const created = await prisma.businessProduct.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      name: input.name,
      sku: input.sku,
      category: input.category,
      description: input.description,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      stock: input.stock,
      minStock: input.minStock,
      unit: input.unit,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      imageUrl: input.imageUrl,
      pricedWithTax: input.pricedWithTax ?? false, // ← NEW
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      syncStatus: "PENDING",
    },
  });

  let dbItems: any[] = [];
  if (input.items?.length > 0) {
    const purchaseItems = input.items.map((item, i) => ({
      id: `PI_${created.id}_${i + 1}`,
      purchaseId: created.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    await prisma.businessPurchaseItem.createMany({ data: purchaseItems });

    // Update stock in DB (restore = add stock for purchases)
    for (const item of purchaseItems) {
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { increment: item.quantity }, syncStatus: "PENDING" },
      });
    }

    dbItems = purchaseItems;
  }

  enqueuePurchaseSync(userId, spreadsheetId, created.id);
  // Also sync stock changes for affected products
  if (dbItems.length > 0) {
    for (const item of dbItems) {
      enqueueProductSync(userId, spreadsheetId, item.productId);
    }
  }
  await invalidateSpreadsheetCache(spreadsheetId);

  const result = await prisma.businessPurchase.findUnique({
    where: { id: created.id },
    include: { items: true },
  });
  return dbRowToPurchase(result!);
}

export async function updatePurchaseStatus(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
  status: Purchase["status"],
  amountPaid: number,
): Promise<Purchase> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const all = await getPurchases(userId, spreadsheetId);
      const idx = all.findIndex((p) => p.id === purchaseId);
      if (idx === -1) throw new Error("Purchase not found");
      all[idx] = {
        ...all[idx],
        status,
        amountPaid,
        amountDue: all[idx].total - amountPaid,
        items: undefined,
      };
      const values = objectsToSheetRows(all, HEADERS.PURCHASES);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.PURCHASES}!A2:T`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      await invalidateSpreadsheetCache(spreadsheetId);
      return all[idx];
    });
  }

  const existing = await prisma.businessPurchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!existing) throw new Error("Purchase not found");

  const updated = await prisma.businessProduct.update({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: productId,
      },
    },
    data: {
      ...updates,
      pricedWithTax: updates.pricedWithTax ?? undefined, // ← NEW (spread handles it but explicit is cleaner)
      updatedAt: new Date(),
      lastSyncedAt: null,
      syncStatus: "PENDING",
    },
  });

  enqueuePurchaseSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToPurchase(updated);
}

export async function deletePurchase(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const all = await getPurchases(userId, spreadsheetId);
      const purchase = all.find((p) => p.id === purchaseId);
      if (!purchase) throw new Error("Purchase not found");
      const filtered = all.filter((p) => p.id !== purchaseId);
      const purchaseValues = objectsToSheetRows(filtered, HEADERS.PURCHASES);
      const padded = padValues(
        purchaseValues,
        HEADERS.PURCHASES.length,
        all.length,
      );
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.PURCHASES}!A2:T`,
        valueInputOption: "RAW",
        requestBody: { values: padded },
      });
      const iRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.PURCHASE_ITEMS,
      });
      const allItems = sheetRowsToObjects(
        iRes.data.values as string[][] | null,
        HEADERS.PURCHASE_ITEMS,
      ) as PurchaseItem[];
      const toRemove = allItems.filter((i) => i.purchaseId === purchaseId);
      const remainingItems = allItems.filter(
        (i) => i.purchaseId !== purchaseId,
      );
      if (toRemove.length > 0) {
        await _rawDeductStock(userId, spreadsheetId, toRemove);
        const itemValues = objectsToSheetRows(
          remainingItems,
          HEADERS.PURCHASE_ITEMS,
        );
        const paddedItems = padValues(
          itemValues,
          HEADERS.PURCHASE_ITEMS.length,
          allItems.length,
        );
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TABS.PURCHASE_ITEMS}!A2:G`,
          valueInputOption: "RAW",
          requestBody: { values: paddedItems },
        });
      }
      await invalidateSpreadsheetCache(spreadsheetId);
    });
  }

  // Get items before deleting (for stock reversal)
  const purchase = await prisma.businessPurchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!purchase) throw new Error("Purchase not found");

  // Reverse stock (deduct — because purchase added stock)
  for (const item of purchase.items) {
    await prisma.businessProduct.updateMany({
      where: { sheetConnectionId: connection.id, id: item.productId },
      data: { stock: { decrement: item.quantity }, syncStatus: "PENDING" },
    });
  }

  // Delete cascade handles items
  await prisma.businessPurchase.delete({
    where: {
      sheetConnectionId_id: {
        sheetConnectionId: connection.id,
        id: purchaseId,
      },
    },
  });

  enqueuePurchaseDeleteSync(userId, spreadsheetId, purchaseId);
  for (const item of purchase.items) {
    enqueueProductSync(userId, spreadsheetId, item.productId);
  }
  await invalidateSpreadsheetCache(spreadsheetId);
}

// ═══════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  variation: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string | null;
  customerName: string | null;
  subtotal: number;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string | null;
  status: "PAID" | "PARTIAL" | "UNPAID";
  saleType: "WALK_IN" | "ONLINE"; // ← NEW
  notes: string | null;
  createdAt: string;
  items?: SaleItem[];
}

export async function getSales(
  userId: string,
  spreadsheetId: string,
): Promise<Sale[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.SALES, spreadsheetId, "biz-sales");

  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });

      if (connection) {
        const dbRows = await prisma.businessSale.findMany({
          where: {
            sheetConnectionId: connection.id,
            externalSheetId: spreadsheetId,
          },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        });
        return dbRows.map(dbRowToSale);
      }

      // Fallback
      const [saleData, itemData] = await queueReadRequest(userId, async () => {
        const sheets = await makeSheetClient(userId);
        const [sRes, iRes] = await Promise.all([
          sheets.spreadsheets.values.get({
            spreadsheetId,
            range: RANGES.SALES,
          }),
          sheets.spreadsheets.values.get({
            spreadsheetId,
            range: RANGES.SALE_ITEMS,
          }),
        ]);
        return [sRes.data.values as string[][], iRes.data.values as string[][]];
      });
      const sales = sheetRowsToObjects(saleData, HEADERS.SALES) as Sale[];
      const items = sheetRowsToObjects(
        itemData,
        HEADERS.SALE_ITEMS,
      ) as SaleItem[];
      return sales.map((s) => ({
        ...s,
        items: items.filter((i) => i.saleId === s.id),
      }));
    },
    CACHE_TTL.SALES,
  );
}

export async function createSale(
  userId: string,
  spreadsheetId: string,
  input: Omit<Sale, "id" | "invoiceNumber" | "createdAt"> & {
    items: Omit<SaleItem, "id" | "saleId">[];
    // Online-only extras (ignored for WALK_IN)
    customerPhone?: string | null;
    customerAddress?: string | null;
    deliveryFee?: number;
  },
): Promise<Sale | BusinessOrder> {
  // ── TASK 1: delegate ONLINE sales to createOrder ──────────────────────────
  if (input.saleType === "ONLINE") {
    const order = await createOrder(userId, spreadsheetId, {
      date: input.date,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      customerAddress: input.customerAddress ?? null,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee ?? 0,
      discountAmount: input.discountAmount,
      total: input.total,
      amountPaid: input.amountPaid,
      amountDue: input.amountDue,
      paymentMethod: input.paymentMethod,
      paymentStatus:
        input.amountPaid >= input.total
          ? "PAID"
          : input.amountPaid > 0
            ? "PARTIAL"
            : "UNPAID",
      status: "PENDING",
      notes: input.notes,
      confirmedAt: null,
      packedAt: null,
      dispatchedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      returnedAt: null,
      items: input.items,
      delivery: null,
    });
    return order;
  }

  // ── WALK_IN: original flow ────────────────────────────────────────────────
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const sRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.SALES,
      });
      const allSales = sheetRowsToObjects(
        sRes.data.values as string[][] | null,
        HEADERS.SALES,
      ) as Sale[];
      const newSale: Sale = {
        id: generateId("SAL", allSales),
        invoiceNumber: generateInvoiceNumber("INV", allSales),
        createdAt: new Date().toISOString(),
        saleType: "WALK_IN",
        ...input,
        items: undefined,
      };
      const saleValues = objectsToSheetRows([newSale], HEADERS.SALES);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.SALES}!A:T`,
        valueInputOption: "RAW",
        requestBody: { values: saleValues },
      });
      if (input.items?.length > 0) {
        const saleItems: SaleItem[] = input.items.map((item, i) => ({
          id: `SI_${newSale.id}_${i + 1}`,
          saleId: newSale.id,
          ...item,
        }));
        const itemValues = objectsToSheetRows(saleItems, HEADERS.SALE_ITEMS);
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${TABS.SALE_ITEMS}!A:H`,
          valueInputOption: "RAW",
          requestBody: { values: itemValues },
        });
        await _rawDeductStock(userId, spreadsheetId, saleItems);
        newSale.items = saleItems;
      }
      await invalidateSpreadsheetCache(spreadsheetId);
      return newSale;
    });
  }

  // DB-first walk-in
  const lastSale = await prisma.businessSale.findFirst({
    where: { sheetConnectionId: connection.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const nextId = generateId(
    "SAL",
    lastSale ? [{ id: lastSale.id }] : [],
    connection.id,
  );

  const allSales = await prisma.businessSale.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const invoiceNumber = generateInvoiceNumber("INV", allSales);

  const now = new Date();
  const created = await prisma.businessSale.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      invoiceNumber,
      date: input.date,
      customerId: input.customerId,
      customerName: input.customerName,
      subtotal: input.subtotal,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: input.discountAmount,
      taxPercent: input.taxPercent,
      taxAmount: input.taxAmount,
      total: input.total,
      amountPaid: input.amountPaid,
      amountDue: input.amountDue,
      paymentMethod: input.paymentMethod,
      status: input.status,
      saleType: "WALK_IN", // ← NEW (always WALK_IN here — ONLINE was handled above)
      notes: input.notes,
      createdAt: now,
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
  });

  let dbItems: any[] = [];
  if (input.items?.length > 0) {
    const saleItems = input.items.map((item, i) => ({
      id: `SI_${created.id}_${i + 1}`,
      saleId: created.id,
      productId: item.productId,
      productName: item.productName,
      variation: item.variation ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    await prisma.businessSaleItem.createMany({ data: saleItems });

    for (const item of saleItems) {
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { decrement: item.quantity }, syncStatus: "PENDING" },
      });
    }

    dbItems = saleItems;
  }

  enqueueSaleSync(userId, spreadsheetId, created.id);
  if (dbItems.length > 0) {
    for (const item of dbItems) {
      enqueueProductSync(userId, spreadsheetId, item.productId);
    }
  }
  await invalidateSpreadsheetCache(spreadsheetId);

  const result = await prisma.businessSale.findUnique({
    where: { id: created.id },
    include: { items: true },
  });
  return dbRowToSale(result!);
}

export async function deleteSale(
  userId: string,
  spreadsheetId: string,
  saleId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });

  if (!connection) {
    return queueWriteRequest(userId, async () => {
      const sheets = await makeSheetClient(userId);
      const allSales = await getSales(userId, spreadsheetId);
      const sale = allSales.find((s) => s.id === saleId);
      if (!sale) throw new Error("Sale not found");
      const filtered = allSales.filter((s) => s.id !== saleId);
      const saleValues = objectsToSheetRows(filtered, HEADERS.SALES);
      const padded = padValues(
        saleValues,
        HEADERS.SALES.length,
        allSales.length,
      );
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SALES}!A2:S`,
        valueInputOption: "RAW",
        requestBody: { values: padded },
      });
      const iRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGES.SALE_ITEMS,
      });
      const allItems = sheetRowsToObjects(
        iRes.data.values as string[][] | null,
        HEADERS.SALE_ITEMS,
      ) as SaleItem[];
      const toRestore = allItems.filter((i) => i.saleId === saleId);
      const remainingItems = allItems.filter((i) => i.saleId !== saleId);
      if (toRestore.length > 0) {
        await _rawRestoreStock(userId, spreadsheetId, toRestore);
        const itemValues = objectsToSheetRows(
          remainingItems,
          HEADERS.SALE_ITEMS,
        );
        const paddedItems = padValues(
          itemValues,
          HEADERS.SALE_ITEMS.length,
          allItems.length,
        );
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TABS.SALE_ITEMS}!A2:H`,
          valueInputOption: "RAW",
          requestBody: { values: paddedItems },
        });
      }
      await invalidateSpreadsheetCache(spreadsheetId);
    });
  }

  const sale = await prisma.businessSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) throw new Error("Sale not found");

  // Restore stock (add back — because sale deducted stock)
  for (const item of sale.items) {
    await prisma.businessProduct.updateMany({
      where: { sheetConnectionId: connection.id, id: item.productId },
      data: { stock: { increment: item.quantity }, syncStatus: "PENDING" },
    });
  }

  await prisma.businessSale.delete({
    where: {
      sheetConnectionId_id: { sheetConnectionId: connection.id, id: saleId },
    },
  });

  enqueueSaleDeleteSync(userId, spreadsheetId, saleId);
  for (const item of sale.items) {
    enqueueProductSync(userId, spreadsheetId, item.productId);
  }
  await invalidateSpreadsheetCache(spreadsheetId);
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variation: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  agentType: "STAFF" | "COURIER";
  agentName: string;
  agentPhone: string | null;
  courierName: string | null;
  trackingCode: string | null;
  deliveryFee: number;
  notes: string | null;
  assignedAt: string;
  deliveredAt: string | null;
}

export interface BusinessOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string | null;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PACKED"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURNED";
  notes: string | null;
  confirmedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  returnedAt: string | null;
  createdAt: string;
  items?: OrderItem[];
  delivery?: Delivery | null;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  condition: "DAMAGED" | "GOOD" | "DEFECTIVE";
}

export interface BusinessReturn {
  id: string;
  returnNumber: string;
  returnType: "CUSTOMER_RETURN" | "SUPPLIER_RETURN";
  date: string;
  saleId: string | null;
  saleInvoice: string | null;
  customerId: string | null;
  customerName: string | null;
  purchaseId: string | null;
  purchaseInvoice: string | null;
  supplierId: string | null;
  supplierName: string | null;
  reason: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RESTOCKED";
  totalValue: number;
  refundAmount: number;
  refundMethod: string | null;
  createdAt: string;
  items?: ReturnItem[];
}

// ─── Order mapper ─────────────────────────────────────────────────────────────

function dbRowToOrder(r: any): BusinessOrder {
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    date: r.date,
    customerId: r.customerId,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerAddress: r.customerAddress,
    subtotal: r.subtotal,
    deliveryFee: r.deliveryFee,
    discountAmount: r.discountAmount,
    total: r.total,
    amountPaid: r.amountPaid,
    amountDue: r.amountDue,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus as BusinessOrder["paymentStatus"],
    status: r.status as BusinessOrder["status"],
    notes: r.notes,
    confirmedAt:
      r.confirmedAt instanceof Date
        ? r.confirmedAt.toISOString()
        : r.confirmedAt,
    packedAt:
      r.packedAt instanceof Date ? r.packedAt.toISOString() : r.packedAt,
    dispatchedAt:
      r.dispatchedAt instanceof Date
        ? r.dispatchedAt.toISOString()
        : r.dispatchedAt,
    deliveredAt:
      r.deliveredAt instanceof Date
        ? r.deliveredAt.toISOString()
        : r.deliveredAt,
    cancelledAt:
      r.cancelledAt instanceof Date
        ? r.cancelledAt.toISOString()
        : r.cancelledAt,
    returnedAt:
      r.returnedAt instanceof Date ? r.returnedAt.toISOString() : r.returnedAt,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    items: r.items?.map((i: any) => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.productName,
      variation: i.variation,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    delivery: r.delivery
      ? {
          id: r.delivery.id,
          orderId: r.delivery.orderId,
          agentType: r.delivery.agentType,
          agentName: r.delivery.agentName,
          agentPhone: r.delivery.agentPhone,
          courierName: r.delivery.courierName,
          trackingCode: r.delivery.trackingCode,
          deliveryFee: r.delivery.deliveryFee,
          notes: r.delivery.notes,
          assignedAt:
            r.delivery.assignedAt instanceof Date
              ? r.delivery.assignedAt.toISOString()
              : r.delivery.assignedAt,
          deliveredAt:
            r.delivery.deliveredAt instanceof Date
              ? r.delivery.deliveredAt.toISOString()
              : null,
        }
      : null,
  };
}

function dbRowToReturn(r: any): BusinessReturn {
  return {
    id: r.id,
    returnNumber: r.returnNumber,
    returnType: r.returnType as BusinessReturn["returnType"],
    date: r.date,
    saleId: r.saleId,
    saleInvoice: r.saleInvoice,
    customerId: r.customerId,
    customerName: r.customerName,
    purchaseId: r.purchaseId,
    purchaseInvoice: r.purchaseInvoice,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    reason: r.reason,
    notes: r.notes,
    status: r.status as BusinessReturn["status"],
    totalValue: r.totalValue,
    refundAmount: r.refundAmount,
    refundMethod: r.refundMethod,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    items: r.items?.map((i: any) => ({
      id: i.id,
      returnId: i.returnId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
      condition: i.condition,
    })),
  };
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function getOrders(
  userId: string,
  spreadsheetId: string,
): Promise<BusinessOrder[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.SALES, spreadsheetId, "biz-orders");
  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });
      if (!connection) throw new Error("Connection not found");

      const dbRows = await prisma.businessOrder.findMany({
        where: {
          sheetConnectionId: connection.id,
          externalSheetId: spreadsheetId,
        },
        include: { items: true, delivery: true },
        orderBy: { createdAt: "desc" },
      });
      return dbRows.map(dbRowToOrder);
    },
    CACHE_TTL.SALES,
  );
}

export async function createOrder(
  userId: string,
  spreadsheetId: string,
  input: Omit<BusinessOrder, "id" | "orderNumber" | "createdAt"> & {
    items: Omit<OrderItem, "id" | "orderId">[];
    delivery?: Omit<
      Delivery,
      "id" | "orderId" | "assignedAt" | "deliveredAt"
    > | null;
  },
): Promise<BusinessOrder> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });
  if (!connection) throw new Error("Connection not found");

  const lastOrder = await prisma.businessOrder.findFirst({
    where: { sheetConnectionId: connection.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const nextId = generateId(
    "ORD",
    lastOrder ? [{ id: lastOrder.id }] : [],
    connection.id,
  );
  const allOrders = await prisma.businessOrder.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const orderNumber = generateInvoiceNumber("ORD", allOrders);
  const now = new Date();

  const created = await prisma.businessOrder.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      orderNumber,
      date: input.date,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      discountAmount: input.discountAmount,
      total: input.total,
      amountPaid: input.amountPaid,
      amountDue: input.amountDue,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      status: "PENDING",
      notes: input.notes,
      createdAt: now,
      syncStatus: "PENDING",
    },
  });

  // Items
  const orderItems = input.items.map((item, i) => ({
    id: `OI_${created.id}_${i + 1}`,
    orderId: created.id,
    productId: item.productId,
    productName: item.productName,
    variation: item.variation ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }));
  if (orderItems.length > 0) {
    await prisma.businessOrderItem.createMany({ data: orderItems });
  }

  // Delivery info (optional at creation)
  if (input.delivery) {
    await prisma.businessDelivery.create({
      data: {
        id: `DEL_${created.id}`,
        orderId: created.id,
        agentType: input.delivery.agentType,
        agentName: input.delivery.agentName,
        agentPhone: input.delivery.agentPhone ?? null,
        courierName: input.delivery.courierName ?? null,
        trackingCode: input.delivery.trackingCode ?? null,
        deliveryFee: input.delivery.deliveryFee,
        notes: input.delivery.notes ?? null,
        assignedAt: now,
      },
    });
  }

  // Stock deducted only on CONFIRMED — not on PENDING
  // (see updateOrderStatus)

  enqueueOrderSync(userId, spreadsheetId, created.id);
  await invalidateSpreadsheetCache(spreadsheetId);

  const result = await prisma.businessOrder.findUnique({
    where: { id: created.id },
    include: { items: true, delivery: true },
  });
  return dbRowToOrder(result!);
}

export async function updateOrderStatus(
  userId: string,
  spreadsheetId: string,
  orderId: string,
  status: BusinessOrder["status"],
  extra?: {
    delivery?: Omit<Delivery, "id" | "orderId" | "assignedAt" | "deliveredAt">;
    amountPaid?: number;
    paymentMethod?: string;
  },
): Promise<BusinessOrder> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });
  if (!connection) throw new Error("Connection not found");

  const existing = await prisma.businessOrder.findUnique({
    where: { id: orderId },
    include: { items: true, delivery: true },
  });
  if (!existing) throw new Error("Order not found");

  const now = new Date();
  const statusTimestamps: Record<string, Date | null> = {
    confirmedAt: existing.confirmedAt,
    packedAt: existing.packedAt,
    dispatchedAt: existing.dispatchedAt,
    deliveredAt: existing.deliveredAt,
    cancelledAt: existing.cancelledAt,
    returnedAt: existing.returnedAt,
  };

  // Set timestamp for new status
  if (status === "CONFIRMED") statusTimestamps.confirmedAt = now;
  if (status === "PACKED") statusTimestamps.packedAt = now;
  if (status === "DISPATCHED") statusTimestamps.dispatchedAt = now;
  if (status === "DELIVERED") statusTimestamps.deliveredAt = now;
  if (status === "CANCELLED") statusTimestamps.cancelledAt = now;
  if (status === "RETURNED") statusTimestamps.returnedAt = now;

  // Stock logic
  const wasConfirmed = [
    "CONFIRMED",
    "PACKED",
    "DISPATCHED",
    "DELIVERED",
  ].includes(existing.status);
  const nowCancelled = status === "CANCELLED";
  const nowReturned = status === "RETURNED";
  const becomingConfirmed =
    status === "CONFIRMED" && existing.status === "PENDING";

  // Deduct stock when PENDING → CONFIRMED
  if (becomingConfirmed) {
    for (const item of existing.items) {
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { decrement: item.quantity }, syncStatus: "PENDING" },
      });
      enqueueProductSync(userId, spreadsheetId, item.productId);
    }
  }

  // Restore stock when CONFIRMED/active → CANCELLED or RETURNED
  if (wasConfirmed && (nowCancelled || nowReturned)) {
    for (const item of existing.items) {
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { increment: item.quantity }, syncStatus: "PENDING" },
      });
      enqueueProductSync(userId, spreadsheetId, item.productId);
    }
  }

  const amountPaid = extra?.amountPaid ?? existing.amountPaid;
  const updatedPaymentStatus =
    amountPaid >= existing.total
      ? "PAID"
      : amountPaid > 0
        ? "PARTIAL"
        : "UNPAID";

  const updated = await prisma.businessOrder.update({
    where: {
      sheetConnectionId_id: { sheetConnectionId: connection.id, id: orderId },
    },
    data: {
      status,
      amountPaid,
      amountDue: Math.max(0, existing.total - amountPaid),
      paymentStatus: updatedPaymentStatus,
      paymentMethod: extra?.paymentMethod ?? existing.paymentMethod,
      ...statusTimestamps,
      syncStatus: "PENDING",
      lastSyncedAt: null,
    },
    include: { items: true, delivery: true },
  });

  // Upsert delivery info if provided
  if (extra?.delivery) {
    await prisma.businessDelivery.upsert({
      where: { orderId },
      update: {
        agentType: extra.delivery.agentType,
        agentName: extra.delivery.agentName,
        agentPhone: extra.delivery.agentPhone ?? null,
        courierName: extra.delivery.courierName ?? null,
        trackingCode: extra.delivery.trackingCode ?? null,
        deliveryFee: extra.delivery.deliveryFee,
        notes: extra.delivery.notes ?? null,
        deliveredAt: status === "DELIVERED" ? now : null,
      },
      create: {
        id: `DEL_${orderId}`,
        orderId,
        agentType: extra.delivery.agentType,
        agentName: extra.delivery.agentName,
        agentPhone: extra.delivery.agentPhone ?? null,
        courierName: extra.delivery.courierName ?? null,
        trackingCode: extra.delivery.trackingCode ?? null,
        deliveryFee: extra.delivery.deliveryFee,
        notes: extra.delivery.notes ?? null,
        assignedAt: now,
        deliveredAt: status === "DELIVERED" ? now : null,
      },
    });
  }

  enqueueOrderSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToOrder(updated);
}

export async function deleteOrder(
  userId: string,
  spreadsheetId: string,
  orderId: string,
): Promise<void> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });
  if (!connection) throw new Error("Connection not found");

  const order = await prisma.businessOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  // Restore stock if order was active
  const wasActive = ["CONFIRMED", "PACKED", "DISPATCHED"].includes(
    order.status,
  );
  if (wasActive) {
    for (const item of order.items) {
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { increment: item.quantity }, syncStatus: "PENDING" },
      });
      enqueueProductSync(userId, spreadsheetId, item.productId);
    }
  }

  await prisma.businessOrder.delete({
    where: {
      sheetConnectionId_id: { sheetConnectionId: connection.id, id: orderId },
    },
  });

  enqueueOrderDeleteSync(userId, spreadsheetId, orderId);
  await invalidateSpreadsheetCache(spreadsheetId);
}

// ─── RETURNS ──────────────────────────────────────────────────────────────────

export async function getReturns(
  userId: string,
  spreadsheetId: string,
): Promise<BusinessReturn[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.TRANSACTIONS,
    spreadsheetId,
    "biz-returns",
  );
  return getOrFetch(
    cacheKey,
    async () => {
      const connection = await prisma.sheetConnection.findFirst({
        where: { userId, spreadsheetId, isActive: true },
        select: { id: true },
      });
      if (!connection) throw new Error("Connection not found");

      const dbRows = await prisma.businessReturn.findMany({
        where: {
          sheetConnectionId: connection.id,
          externalSheetId: spreadsheetId,
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      return dbRows.map(dbRowToReturn);
    },
    CACHE_TTL.TRANSACTIONS,
  );
}

export async function createReturn(
  userId: string,
  spreadsheetId: string,
  input: Omit<BusinessReturn, "id" | "returnNumber" | "createdAt"> & {
    items: Omit<ReturnItem, "id" | "returnId">[];
  },
): Promise<BusinessReturn> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });
  if (!connection) throw new Error("Connection not found");

  const lastReturn = await prisma.businessReturn.findFirst({
    where: { sheetConnectionId: connection.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const prefix = input.returnType === "CUSTOMER_RETURN" ? "CRT" : "SRT";
  const nextId = generateId(
    `${prefix}`,
    lastReturn ? [{ id: lastReturn.id }] : [],
  );
  const allReturns = await prisma.businessReturn.findMany({
    where: { sheetConnectionId: connection.id },
    select: { id: true },
  });
  const returnNumber = generateInvoiceNumber(prefix, allReturns);
  const now = new Date();

  const created = await prisma.businessReturn.create({
    data: {
      id: nextId,
      sheetConnectionId: connection.id,
      externalSheetId: spreadsheetId,
      returnNumber,
      returnType: input.returnType,
      date: input.date,
      saleId: input.saleId,
      saleInvoice: input.saleInvoice,
      customerId: input.customerId,
      customerName: input.customerName,
      purchaseId: input.purchaseId,
      purchaseInvoice: input.purchaseInvoice,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      reason: input.reason,
      notes: input.notes,
      status: "PENDING",
      totalValue: input.totalValue,
      refundAmount: input.refundAmount,
      refundMethod: input.refundMethod,
      createdAt: now,
      syncStatus: "PENDING",
    },
  });

  const returnItems = input.items.map((item, i) => ({
    id: `RI_${created.id}_${i + 1}`,
    returnId: created.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    condition: item.condition,
  }));
  if (returnItems.length > 0) {
    await prisma.businessReturnItem.createMany({ data: returnItems });
  }

  enqueueReturnSync(userId, spreadsheetId, created.id);
  await invalidateSpreadsheetCache(spreadsheetId);

  const result = await prisma.businessReturn.findUnique({
    where: { id: created.id },
    include: { items: true },
  });
  return dbRowToReturn(result!);
}

export async function approveReturn(
  userId: string,
  spreadsheetId: string,
  returnId: string,
  refundAmount: number,
  refundMethod: string,
): Promise<BusinessReturn> {
  const connection = await prisma.sheetConnection.findFirst({
    where: { userId, spreadsheetId, isActive: true },
    select: { id: true },
  });
  if (!connection) throw new Error("Connection not found");

  const existing = await prisma.businessReturn.findUnique({
    where: { id: returnId },
    include: { items: true },
  });
  if (!existing) throw new Error("Return not found");

  // Stock adjustment on approval
  for (const item of existing.items) {
    if (existing.returnType === "CUSTOMER_RETURN") {
      // Customer returning item → add back to stock
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { increment: item.quantity }, syncStatus: "PENDING" },
      });
    } else {
      // Supplier return → remove from stock
      await prisma.businessProduct.updateMany({
        where: { sheetConnectionId: connection.id, id: item.productId },
        data: { stock: { decrement: item.quantity }, syncStatus: "PENDING" },
      });
    }
    enqueueProductSync(userId, spreadsheetId, item.productId);
  }

  const updated = await prisma.businessReturn.update({
    where: {
      sheetConnectionId_id: { sheetConnectionId: connection.id, id: returnId },
    },
    data: {
      status: "RESTOCKED",
      refundAmount,
      refundMethod,
      syncStatus: "PENDING",
    },
    include: { items: true },
  });

  enqueueReturnSync(userId, spreadsheetId, updated.id);
  await invalidateSpreadsheetCache(spreadsheetId);
  return dbRowToReturn(updated);
}

// ═══════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════

export interface BusinessReport {
  overview: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
    totalSales: number;
    totalPurchases: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalProducts: number;
    lowStockCount: number;
  };
  salesByDate: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQty: number;
    totalRevenue: number;
  }>;
  lowStockProducts: Product[];
  recentSales: Sale[];
  recentPurchases: Purchase[];
  customerSummary: Array<{
    customerId: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  supplierSummary: Array<{
    supplierId: string;
    supplierName: string;
    totalPurchases: number;
    totalSpent: number;
  }>;
}

export async function getBusinessReport(
  userId: string,
  spreadsheetId: string,
): Promise<BusinessReport> {
  const [products, sales, purchases, customers, suppliers] = await Promise.all([
    getProducts(userId, spreadsheetId),
    getSales(userId, spreadsheetId),
    getPurchases(userId, spreadsheetId),
    getCustomers(userId, spreadsheetId),
    getSuppliers(userId, spreadsheetId),
  ]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.total, 0);
  const grossProfit = totalRevenue - totalCost;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const lowStockProducts = products.filter(
    (p) => p.stock <= p.minStock && p.minStock > 0,
  );

  const salesByDateMap = new Map<string, { revenue: number; orders: number }>();
  sales.forEach((s) => {
    const date = new Date(s.date).toISOString().split("T")[0];
    const existing = salesByDateMap.get(date) ?? { revenue: 0, orders: 0 };
    salesByDateMap.set(date, {
      revenue: existing.revenue + s.total,
      orders: existing.orders + 1,
    });
  });
  const salesByDate = Array.from(salesByDateMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const productMap = new Map<
    string,
    { productName: string; totalQty: number; totalRevenue: number }
  >();
  sales.forEach((s) => {
    (s.items ?? []).forEach((item) => {
      const existing = productMap.get(item.productId) ?? {
        productName: item.productName,
        totalQty: 0,
        totalRevenue: 0,
      };
      productMap.set(item.productId, {
        productName: item.productName,
        totalQty: existing.totalQty + item.quantity,
        totalRevenue: existing.totalRevenue + item.total,
      });
    });
  });
  const topProducts = Array.from(productMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 10);

  const custMap = new Map<
    string,
    { customerName: string; totalOrders: number; totalSpent: number }
  >();
  sales.forEach((s) => {
    if (!s.customerId) return;
    const existing = custMap.get(s.customerId) ?? {
      customerName: s.customerName ?? "Unknown",
      totalOrders: 0,
      totalSpent: 0,
    };
    custMap.set(s.customerId, {
      customerName: existing.customerName,
      totalOrders: existing.totalOrders + 1,
      totalSpent: existing.totalSpent + s.total,
    });
  });
  const customerSummary = Array.from(custMap.entries())
    .map(([customerId, v]) => ({ customerId, ...v }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const supMap = new Map<
    string,
    { supplierName: string; totalPurchases: number; totalSpent: number }
  >();
  purchases.forEach((p) => {
    if (!p.supplierId) return;
    const existing = supMap.get(p.supplierId) ?? {
      supplierName: p.supplierName ?? "Unknown",
      totalPurchases: 0,
      totalSpent: 0,
    };
    supMap.set(p.supplierId, {
      supplierName: existing.supplierName,
      totalPurchases: existing.totalPurchases + 1,
      totalSpent: existing.totalSpent + p.total,
    });
  });
  const supplierSummary = Array.from(supMap.entries())
    .map(([supplierId, v]) => ({ supplierId, ...v }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    overview: {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      totalSales: sales.length,
      totalPurchases: purchases.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
    },
    salesByDate,
    topProducts,
    lowStockProducts,
    recentSales: sales
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10),
    recentPurchases: purchases
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10),
    customerSummary,
    supplierSummary,
  };
}

export { makeSheetClient as makeSheetClientPublic };
export {
  sheetRowsToObjects as sheetRowsToObjectsPublic,
  objectsToSheetRows as objectsToSheetRowsPublic,
  padValues as padValuesPublic,
};
export { RANGES };
