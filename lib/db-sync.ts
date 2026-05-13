// lib/db-sync.ts

import { prisma } from "@/lib/db";
import {
  getProducts as getProductsFromSheet,
  type Product as SheetProduct,
  makeSheetClientPublic,
  RANGES,
  HEADERS,
  TABS,
  sheetRowsToObjectsPublic,
  objectsToSheetRowsPublic,
  padValuesPublic,
  RANGES as SHEET_RANGES,
  HEADERS as SHEET_HEADERS,
  type Customer as SheetCustomer,
  type Supplier as SheetSupplier,
  type Purchase as SheetPurchase, // ADD
  type PurchaseItem as SheetPurchaseItem, // ADD
  type Sale as SheetSale, // ADD
  type SaleItem as SheetSaleItem,
  type BusinessOrder as SheetOrder,
  type BusinessOrderItem as SheetOrderItem,
  type BusinessDelivery as SheetDelivery,
  type BusinessReturn as SheetReturn,
  type BusinessReturnItem as SheetReturnItem,
} from "@/lib/google-sheet-business";
import { invalidateSpreadsheetCache } from "@/lib/cache";
import { sheetsQueue } from "@/lib/google-sheets-queue";
import { getOAuth2Client } from "@/lib/google-sheet";
import { google } from "googleapis";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT: Sheet → Postgres (first connect or manual resync)
// ─────────────────────────────────────────────────────────────────────────────

export async function importProductsFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<number> {
  // Read DIRECTLY from Google Sheets — no queue, no cache, no DB loop
  let sheetProducts: SheetProduct[] = [];

  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGES.PRODUCTS,
    });

    sheetProducts = sheetRowsToObjectsPublic(
      res.data.values as string[][] | null,
      HEADERS.PRODUCTS,
    ) as SheetProduct[];
  } catch (err) {
    console.warn("[Sync] Could not read sheet during import:", err);
    return 0;
  }

  if (sheetProducts.length === 0) return 0;

  for (const sp of sheetProducts) {
    await prisma.businessProduct.upsert({
      where: {
        sheetConnectionId_id: {
          sheetConnectionId,
          id: sp.id,
        },
      },
      update: {
        name: sp.name,
        sku: sp.sku,
        category: sp.category,
        description: sp.description,
        costPrice: sp.costPrice,
        sellingPrice: sp.sellingPrice,
        stock: sp.stock,
        minStock: sp.minStock,
        unit: sp.unit,
        supplierId: sp.supplierId,
        supplierName: sp.supplierName,
        imageUrl: sp.imageUrl,
        updatedAt: new Date(sp.updatedAt),
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
        syncError: null,
      },
      create: {
        id: sp.id,
        sheetConnectionId,
        externalSheetId: spreadsheetId,
        name: sp.name,
        sku: sp.sku,
        category: sp.category,
        description: sp.description,
        costPrice: sp.costPrice,
        sellingPrice: sp.sellingPrice,
        stock: sp.stock,
        minStock: sp.minStock,
        unit: sp.unit,
        supplierId: sp.supplierId,
        supplierName: sp.supplierName,
        imageUrl: sp.imageUrl,
        createdAt: new Date(sp.createdAt),
        updatedAt: new Date(sp.updatedAt),
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });
  }

  await prisma.sheetConnection.update({
    where: { id: sheetConnectionId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED" },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
  return sheetProducts.length;
}
// ─────────────────────────────────────────────────────────────────────────────
// SYNC: Postgres product → Google Sheet (async, called by queue)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncProductToSheet(
  userId: string,
  spreadsheetId: string,
  productId: string,
): Promise<void> {
  const dbProduct = await prisma.businessProduct.findUnique({
    where: { id: productId },
  });
  if (!dbProduct) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  // Read current sheet state directly (no queue — we ARE inside the queue)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS,
  ) as SheetProduct[];

  const idx = all.findIndex((p) => p.id === dbProduct.id);

  const sheetProduct: SheetProduct = {
    id: dbProduct.id,
    name: dbProduct.name,
    sku: dbProduct.sku,
    category: dbProduct.category,
    description: dbProduct.description,
    costPrice: dbProduct.costPrice,
    sellingPrice: dbProduct.sellingPrice,
    stock: dbProduct.stock,
    minStock: dbProduct.minStock,
    unit: dbProduct.unit,
    supplierId: dbProduct.supplierId,
    supplierName: dbProduct.supplierName,
    imageUrl: dbProduct.imageUrl,
    createdAt: dbProduct.createdAt.toISOString(),
    updatedAt: dbProduct.updatedAt.toISOString(),
  };

  if (idx === -1) {
    // Not in sheet — append as new row
    const values = objectsToSheetRowsPublic([sheetProduct], HEADERS.PRODUCTS);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.PRODUCTS}!A:O`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    // Update existing row in place
    all[idx] = sheetProduct;
    const values = objectsToSheetRowsPublic(all, HEADERS.PRODUCTS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.PRODUCTS}!A2:O`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  await prisma.businessProduct.update({
    where: { id: productId },
    data: {
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
      syncError: null,
    },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC: Delete product from Google Sheet (async, called by queue)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncProductDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  productId: string,
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS,
  ) as SheetProduct[];

  const filtered = all.filter((p) => p.id !== productId);

  // Nothing to do if already missing
  if (filtered.length === all.length) return;

  const values = objectsToSheetRowsPublic(filtered, HEADERS.PRODUCTS);
  const padded = padValuesPublic(values, HEADERS.PRODUCTS.length, all.length);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.PRODUCTS}!A2:O`,
    valueInputOption: "RAW",
    requestBody: { values: padded },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENQUEUE helpers (non-blocking — used by API routes)
// ─────────────────────────────────────────────────────────────────────────────

export function enqueueProductSync(
  userId: string,
  spreadsheetId: string,
  productId: string,
): void {
  // fire-and-forget — mark FAILED on rejection
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncProductToSheet(userId, spreadsheetId, productId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessProduct
        .update({
          where: { id: productId },
          data: {
            syncStatus: "FAILED",
            syncError: "Queue error — will retry on next reconcile",
          },
        })
        .catch(() => {}); // swallow — product may already be deleted
    });
}

export function enqueueProductDeleteSync(
  userId: string,
  spreadsheetId: string,
  productId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () =>
        syncProductDeleteToSheet(userId, spreadsheetId, productId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(() => {});
}

// Suppliers

export async function importSuppliersFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<number> {
  let sheetSuppliers: SheetSupplier[] = [];

  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEET_RANGES.SUPPLIERS,
    });

    sheetSuppliers = sheetRowsToObjectsPublic(
      res.data.values as string[][] | null,
      SHEET_HEADERS.SUPPLIERS,
    ) as SheetSupplier[];
  } catch (err) {
    console.warn("[Sync] Could not read suppliers sheet:", err);
    return 0;
  }

  if (sheetSuppliers.length === 0) return 0;

  for (const ss of sheetSuppliers) {
    await prisma.businessSupplier.upsert({
      where: {
        sheetConnectionId_id: {
          sheetConnectionId,
          id: ss.id,
        },
      },
      update: {
        name: ss.name,
        phone: ss.phone,
        email: ss.email,
        address: ss.address,
        city: ss.city,
        contactPerson: ss.contactPerson,
        paymentTerms: ss.paymentTerms,
        notes: ss.notes,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
        syncError: null,
      },
      create: {
        id: ss.id,
        sheetConnectionId,
        externalSheetId: spreadsheetId,
        name: ss.name,
        phone: ss.phone,
        email: ss.email,
        address: ss.address,
        city: ss.city,
        contactPerson: ss.contactPerson,
        paymentTerms: ss.paymentTerms,
        notes: ss.notes,
        createdAt: new Date(ss.createdAt),
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });
  }

  await prisma.sheetConnection.update({
    where: { id: sheetConnectionId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED" },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
  return sheetSuppliers.length;
}

export async function syncSupplierToSheet(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
): Promise<void> {
  const dbSupplier = await prisma.businessSupplier.findUnique({
    where: { id: supplierId },
  });
  if (!dbSupplier) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SUPPLIERS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    SHEET_HEADERS.SUPPLIERS,
  ) as SheetSupplier[];

  const sheetSupplier: SheetSupplier = {
    id: dbSupplier.id,
    name: dbSupplier.name,
    phone: dbSupplier.phone,
    email: dbSupplier.email,
    address: dbSupplier.address,
    city: dbSupplier.city,
    contactPerson: dbSupplier.contactPerson,
    paymentTerms: dbSupplier.paymentTerms,
    notes: dbSupplier.notes,
    createdAt: dbSupplier.createdAt.toISOString(),
  };

  const idx = all.findIndex((s) => s.id === dbSupplier.id);

  if (idx === -1) {
    const values = objectsToSheetRowsPublic(
      [sheetSupplier],
      SHEET_HEADERS.SUPPLIERS,
    );
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_RANGES.SUPPLIERS.split("!")[0]}!A:J`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    all[idx] = sheetSupplier;
    const values = objectsToSheetRowsPublic(all, SHEET_HEADERS.SUPPLIERS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_RANGES.SUPPLIERS.split("!")[0]}!A2:J`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  await prisma.businessSupplier.update({
    where: { id: supplierId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export async function syncSupplierDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SUPPLIERS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    SHEET_HEADERS.SUPPLIERS,
  ) as SheetSupplier[];

  const filtered = all.filter((s) => s.id !== supplierId);
  if (filtered.length === all.length) return;

  const values = objectsToSheetRowsPublic(filtered, SHEET_HEADERS.SUPPLIERS);
  const padded = padValuesPublic(
    values,
    SHEET_HEADERS.SUPPLIERS.length,
    all.length,
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_RANGES.SUPPLIERS.split("!")[0]}!A2:J`,
    valueInputOption: "RAW",
    requestBody: { values: padded },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueSupplierSync(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncSupplierToSheet(userId, spreadsheetId, supplierId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessSupplier
        .update({
          where: { id: supplierId },
          data: { syncStatus: "FAILED", syncError: "Queue error" },
        })
        .catch(() => {});
    });
}

export function enqueueSupplierDeleteSync(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () =>
        syncSupplierDeleteToSheet(userId, spreadsheetId, supplierId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(() => {});
}

// Customers

export async function importCustomersFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<number> {
  let sheetCustomers: SheetCustomer[] = [];

  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEET_RANGES.CUSTOMERS,
    });

    sheetCustomers = sheetRowsToObjectsPublic(
      res.data.values as string[][] | null,
      SHEET_HEADERS.CUSTOMERS,
    ) as SheetCustomer[];
  } catch (err) {
    console.warn("[Sync] Could not read customers sheet:", err);
    return 0;
  }

  if (sheetCustomers.length === 0) return 0;

  for (const sc of sheetCustomers) {
    await prisma.businessCustomer.upsert({
      where: {
        sheetConnectionId_id: {
          sheetConnectionId,
          id: sc.id,
        },
      },
      update: {
        name: sc.name,
        phone: sc.phone,
        email: sc.email,
        address: sc.address,
        city: sc.city,
        customerType: sc.customerType,
        notes: sc.notes,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
        syncError: null,
      },
      create: {
        id: sc.id,
        sheetConnectionId,
        externalSheetId: spreadsheetId,
        name: sc.name,
        phone: sc.phone,
        email: sc.email,
        address: sc.address,
        city: sc.city,
        customerType: sc.customerType,
        notes: sc.notes,
        createdAt: new Date(sc.createdAt),
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });
  }

  await invalidateSpreadsheetCache(spreadsheetId);
  return sheetCustomers.length;
}

export async function syncCustomerToSheet(
  userId: string,
  spreadsheetId: string,
  customerId: string,
): Promise<void> {
  const dbCustomer = await prisma.businessCustomer.findUnique({
    where: { id: customerId },
  });
  if (!dbCustomer) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.CUSTOMERS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    SHEET_HEADERS.CUSTOMERS,
  ) as SheetCustomer[];

  const sheetCustomer: SheetCustomer = {
    id: dbCustomer.id,
    name: dbCustomer.name,
    phone: dbCustomer.phone,
    email: dbCustomer.email,
    address: dbCustomer.address,
    city: dbCustomer.city,
    customerType: dbCustomer.customerType as "WALK_IN" | "ONLINE",
    notes: dbCustomer.notes,
    createdAt: dbCustomer.createdAt.toISOString(),
  };

  const idx = all.findIndex((c) => c.id === dbCustomer.id);

  if (idx === -1) {
    const values = objectsToSheetRowsPublic(
      [sheetCustomer],
      SHEET_HEADERS.CUSTOMERS,
    );
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `Customers!A:I`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    all[idx] = sheetCustomer;
    const values = objectsToSheetRowsPublic(all, SHEET_HEADERS.CUSTOMERS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Customers!A2:I`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  await prisma.businessCustomer.update({
    where: { id: customerId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export async function syncCustomerDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  customerId: string,
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.CUSTOMERS,
  });

  const all = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    SHEET_HEADERS.CUSTOMERS,
  ) as SheetCustomer[];

  const filtered = all.filter((c) => c.id !== customerId);
  if (filtered.length === all.length) return;

  const values = objectsToSheetRowsPublic(filtered, SHEET_HEADERS.CUSTOMERS);
  const padded = padValuesPublic(
    values,
    SHEET_HEADERS.CUSTOMERS.length,
    all.length,
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Customers!A2:I`,
    valueInputOption: "RAW",
    requestBody: { values: padded },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueCustomerSync(
  userId: string,
  spreadsheetId: string,
  customerId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncCustomerToSheet(userId, spreadsheetId, customerId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessCustomer
        .update({
          where: { id: customerId },
          data: { syncStatus: "FAILED", syncError: "Queue error" },
        })
        .catch(() => {});
    });
}

export function enqueueCustomerDeleteSync(
  userId: string,
  spreadsheetId: string,
  customerId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () =>
        syncCustomerDeleteToSheet(userId, spreadsheetId, customerId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(() => {});
}

export async function importPurchasesFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<number> {
  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const [pRes, piRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: SHEET_RANGES.PURCHASES,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: SHEET_RANGES.PURCHASE_ITEMS,
      }),
    ]);

    const purchases = sheetRowsToObjectsPublic(
      pRes.data.values as string[][] | null,
      SHEET_HEADERS.PURCHASES,
    ) as SheetPurchase[];

    const purchaseItems = sheetRowsToObjectsPublic(
      piRes.data.values as string[][] | null,
      SHEET_HEADERS.PURCHASE_ITEMS,
    ) as SheetPurchaseItem[];

    if (purchases.length === 0) return 0;

    for (const sp of purchases) {
      await prisma.businessPurchase.upsert({
        where: {
          sheetConnectionId_id: { sheetConnectionId, id: sp.id },
        },
        update: {
          invoiceNumber: sp.invoiceNumber,
          date: sp.date,
          supplierId: sp.supplierId,
          supplierName: sp.supplierName,
          subtotal: sp.subtotal,
          taxPercent: sp.taxPercent,
          taxAmount: sp.taxAmount,
          transportCost: sp.transportCost,
          customsCost: sp.customsCost,
          storageCost: sp.storageCost,
          otherExpenses: sp.otherExpenses,
          landedCost: sp.landedCost,
          total: sp.total,
          amountPaid: sp.amountPaid,
          amountDue: sp.amountDue,
          status: sp.status,
          imageUrl: sp.imageUrl,
          notes: sp.notes,
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
          syncError: null,
        },
        create: {
          id: sp.id,
          sheetConnectionId,
          externalSheetId: spreadsheetId,
          invoiceNumber: sp.invoiceNumber,
          date: sp.date,
          supplierId: sp.supplierId,
          supplierName: sp.supplierName,
          subtotal: sp.subtotal,
          taxPercent: sp.taxPercent,
          taxAmount: sp.taxAmount,
          transportCost: sp.transportCost,
          customsCost: sp.customsCost,
          storageCost: sp.storageCost,
          otherExpenses: sp.otherExpenses,
          landedCost: sp.landedCost,
          total: sp.total,
          amountPaid: sp.amountPaid,
          amountDue: sp.amountDue,
          status: sp.status,
          imageUrl: sp.imageUrl,
          notes: sp.notes,
          createdAt: new Date(sp.createdAt),
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
        },
      });

      // Delete old items for this purchase, re-insert
      await prisma.businessPurchaseItem.deleteMany({
        where: { purchaseId: sp.id },
      });

      const items = purchaseItems.filter((i) => i.purchaseId === sp.id);
      if (items.length > 0) {
        await prisma.businessPurchaseItem.createMany({
          data: items.map((i) => ({
            id: i.id,
            purchaseId: sp.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        });
      }
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return purchases.length;
  } catch (err) {
    console.warn("[Sync] Could not read purchases sheet:", err);
    return 0;
  }
}

export async function syncPurchaseToSheet(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
): Promise<void> {
  const dbPurchase = await prisma.businessPurchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!dbPurchase) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  // Sync purchase row
  const pRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.PURCHASES,
  });
  const allPurchases = sheetRowsToObjectsPublic(
    pRes.data.values as string[][] | null,
    SHEET_HEADERS.PURCHASES,
  ) as SheetPurchase[];

  const sheetPurchase: any = {
    id: dbPurchase.id,
    invoiceNumber: dbPurchase.invoiceNumber,
    date: dbPurchase.date,
    supplierId: dbPurchase.supplierId,
    supplierName: dbPurchase.supplierName,
    subtotal: dbPurchase.subtotal,
    taxPercent: dbPurchase.taxPercent,
    taxAmount: dbPurchase.taxAmount,
    transportCost: dbPurchase.transportCost,
    customsCost: dbPurchase.customsCost,
    storageCost: dbPurchase.storageCost,
    otherExpenses: dbPurchase.otherExpenses,
    landedCost: dbPurchase.landedCost,
    total: dbPurchase.total,
    amountPaid: dbPurchase.amountPaid,
    amountDue: dbPurchase.amountDue,
    status: dbPurchase.status,
    imageUrl: dbPurchase.imageUrl,
    notes: dbPurchase.notes,
    createdAt: dbPurchase.createdAt.toISOString(),
  };

  const pIdx = allPurchases.findIndex((p) => p.id === dbPurchase.id);
  if (pIdx === -1) {
    const values = objectsToSheetRowsPublic(
      [sheetPurchase],
      SHEET_HEADERS.PURCHASES,
    );
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `Purchases!A:T`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    allPurchases[pIdx] = sheetPurchase;
    const values = objectsToSheetRowsPublic(
      allPurchases,
      SHEET_HEADERS.PURCHASES,
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Purchases!A2:T`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  // Sync purchase items — full replace for this purchase
  const piRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.PURCHASE_ITEMS,
  });
  const allItems = sheetRowsToObjectsPublic(
    piRes.data.values as string[][] | null,
    SHEET_HEADERS.PURCHASE_ITEMS,
  ) as SheetPurchaseItem[];

  const otherItems = allItems.filter((i) => i.purchaseId !== dbPurchase.id);
  const newItems: SheetPurchaseItem[] = dbPurchase.items.map((i) => ({
    id: i.id,
    purchaseId: dbPurchase.id,
    productId: i.productId,
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: i.total,
  }));

  const mergedItems = [...otherItems, ...newItems];
  const itemValues = objectsToSheetRowsPublic(
    mergedItems,
    SHEET_HEADERS.PURCHASE_ITEMS,
  );
  const paddedItems = padValuesPublic(
    itemValues,
    SHEET_HEADERS.PURCHASE_ITEMS.length,
    Math.max(allItems.length, mergedItems.length),
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `PurchaseItems!A2:G`,
    valueInputOption: "RAW",
    requestBody: { values: paddedItems },
  });

  await prisma.businessPurchase.update({
    where: { id: purchaseId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export async function syncPurchaseDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  // Remove purchase row
  const pRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.PURCHASES,
  });
  const allPurchases = sheetRowsToObjectsPublic(
    pRes.data.values as string[][] | null,
    SHEET_HEADERS.PURCHASES,
  ) as SheetPurchase[];
  const filteredP = allPurchases.filter((p) => p.id !== purchaseId);
  if (filteredP.length < allPurchases.length) {
    const values = objectsToSheetRowsPublic(filteredP, SHEET_HEADERS.PURCHASES);
    const padded = padValuesPublic(
      values,
      SHEET_HEADERS.PURCHASES.length,
      allPurchases.length,
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Purchases!A2:T`,
      valueInputOption: "RAW",
      requestBody: { values: padded },
    });
  }

  // Remove purchase items
  const piRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.PURCHASE_ITEMS,
  });
  const allItems = sheetRowsToObjectsPublic(
    piRes.data.values as string[][] | null,
    SHEET_HEADERS.PURCHASE_ITEMS,
  ) as SheetPurchaseItem[];
  const filteredI = allItems.filter((i) => i.purchaseId !== purchaseId);
  if (filteredI.length < allItems.length) {
    const values = objectsToSheetRowsPublic(
      filteredI,
      SHEET_HEADERS.PURCHASE_ITEMS,
    );
    const padded = padValuesPublic(
      values,
      SHEET_HEADERS.PURCHASE_ITEMS.length,
      allItems.length,
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `PurchaseItems!A2:G`,
      valueInputOption: "RAW",
      requestBody: { values: padded },
    });
  }

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueuePurchaseSync(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncPurchaseToSheet(userId, spreadsheetId, purchaseId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessPurchase
        .update({
          where: { id: purchaseId },
          data: { syncStatus: "FAILED", syncError: "Queue error" },
        })
        .catch(() => {});
    });
}

export function enqueuePurchaseDeleteSync(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () =>
        syncPurchaseDeleteToSheet(userId, spreadsheetId, purchaseId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────────────────────────────────────

export async function importSalesFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<number> {
  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const [sRes, siRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: SHEET_RANGES.SALES,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: SHEET_RANGES.SALE_ITEMS,
      }),
    ]);

    const sales = sheetRowsToObjectsPublic(
      sRes.data.values as string[][] | null,
      SHEET_HEADERS.SALES,
    ) as SheetSale[];

    const saleItems = sheetRowsToObjectsPublic(
      siRes.data.values as string[][] | null,
      SHEET_HEADERS.SALE_ITEMS,
    ) as SheetSaleItem[];

    if (sales.length === 0) return 0;

    for (const ss of sales) {
      await prisma.businessSale.upsert({
        where: {
          sheetConnectionId_id: { sheetConnectionId, id: ss.id },
        },
        update: {
          invoiceNumber: ss.invoiceNumber,
          date: ss.date,
          customerId: ss.customerId,
          customerName: ss.customerName,
          subtotal: ss.subtotal,
          discountType: ss.discountType,
          discountValue: ss.discountValue,
          discountAmount: ss.discountAmount,
          taxPercent: ss.taxPercent,
          taxAmount: ss.taxAmount,
          total: ss.total,
          amountPaid: ss.amountPaid,
          amountDue: ss.amountDue,
          paymentMethod: ss.paymentMethod,
          status: ss.status,
          notes: ss.notes,
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
          syncError: null,
        },
        create: {
          id: ss.id,
          sheetConnectionId,
          externalSheetId: spreadsheetId,
          invoiceNumber: ss.invoiceNumber,
          date: ss.date,
          customerId: ss.customerId,
          customerName: ss.customerName,
          subtotal: ss.subtotal,
          discountType: ss.discountType,
          discountValue: ss.discountValue,
          discountAmount: ss.discountAmount,
          taxPercent: ss.taxPercent,
          taxAmount: ss.taxAmount,
          total: ss.total,
          amountPaid: ss.amountPaid,
          amountDue: ss.amountDue,
          paymentMethod: ss.paymentMethod,
          status: ss.status,
          notes: ss.notes,
          createdAt: new Date(ss.createdAt),
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
        },
      });

      await prisma.businessSaleItem.deleteMany({ where: { saleId: ss.id } });

      const items = saleItems.filter((i) => i.saleId === ss.id);
      if (items.length > 0) {
        await prisma.businessSaleItem.createMany({
          data: items.map((i) => ({
            id: i.id,
            saleId: ss.id,
            productId: i.productId,
            productName: i.productName,
            variation: i.variation,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        });
      }
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return sales.length;
  } catch (err) {
    console.warn("[Sync] Could not read sales sheet:", err);
    return 0;
  }
}

export async function syncSaleToSheet(
  userId: string,
  spreadsheetId: string,
  saleId: string,
): Promise<void> {
  const dbSale = await prisma.businessSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!dbSale) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const sRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SALES,
  });
  const allSales = sheetRowsToObjectsPublic(
    sRes.data.values as string[][] | null,
    SHEET_HEADERS.SALES,
  ) as SheetSale[];

  const sheetSale: any = {
    id: dbSale.id,
    invoiceNumber: dbSale.invoiceNumber,
    date: dbSale.date,
    customerId: dbSale.customerId,
    customerName: dbSale.customerName,
    subtotal: dbSale.subtotal,
    discountType: dbSale.discountType,
    discountValue: dbSale.discountValue,
    discountAmount: dbSale.discountAmount,
    taxPercent: dbSale.taxPercent,
    taxAmount: dbSale.taxAmount,
    total: dbSale.total,
    amountPaid: dbSale.amountPaid,
    amountDue: dbSale.amountDue,
    paymentMethod: dbSale.paymentMethod,
    status: dbSale.status,
    notes: dbSale.notes,
    createdAt: dbSale.createdAt.toISOString(),
  };

  const sIdx = allSales.findIndex((s) => s.id === dbSale.id);
  if (sIdx === -1) {
    const values = objectsToSheetRowsPublic([sheetSale], SHEET_HEADERS.SALES);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `Sales!A:S`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    allSales[sIdx] = sheetSale;
    const values = objectsToSheetRowsPublic(allSales, SHEET_HEADERS.SALES);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sales!A2:S`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  // Sync sale items
  const siRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SALE_ITEMS,
  });
  const allItems = sheetRowsToObjectsPublic(
    siRes.data.values as string[][] | null,
    SHEET_HEADERS.SALE_ITEMS,
  ) as SheetSaleItem[];

  const otherItems = allItems.filter((i) => i.saleId !== dbSale.id);
  const newItems: SheetSaleItem[] = dbSale.items.map((i) => ({
    id: i.id,
    saleId: dbSale.id,
    productId: i.productId,
    productName: i.productName,
    variation: i.variation,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: i.total,
  }));

  const mergedItems = [...otherItems, ...newItems];
  const itemValues = objectsToSheetRowsPublic(
    mergedItems,
    SHEET_HEADERS.SALE_ITEMS,
  );
  const paddedItems = padValuesPublic(
    itemValues,
    SHEET_HEADERS.SALE_ITEMS.length,
    Math.max(allItems.length, mergedItems.length),
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `SaleItems!A2:H`,
    valueInputOption: "RAW",
    requestBody: { values: paddedItems },
  });

  await prisma.businessSale.update({
    where: { id: saleId },
    data: { lastSyncedAt: new Date(), syncStatus: "SYNCED", syncError: null },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export async function syncSaleDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  saleId: string,
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const sRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SALES,
  });
  const allSales = sheetRowsToObjectsPublic(
    sRes.data.values as string[][] | null,
    SHEET_HEADERS.SALES,
  ) as SheetSale[];
  const filteredS = allSales.filter((s) => s.id !== saleId);
  if (filteredS.length < allSales.length) {
    const values = objectsToSheetRowsPublic(filteredS, SHEET_HEADERS.SALES);
    const padded = padValuesPublic(
      values,
      SHEET_HEADERS.SALES.length,
      allSales.length,
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sales!A2:S`,
      valueInputOption: "RAW",
      requestBody: { values: padded },
    });
  }

  const siRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.SALE_ITEMS,
  });
  const allItems = sheetRowsToObjectsPublic(
    siRes.data.values as string[][] | null,
    SHEET_HEADERS.SALE_ITEMS,
  ) as SheetSaleItem[];
  const filteredI = allItems.filter((i) => i.saleId !== saleId);
  if (filteredI.length < allItems.length) {
    const values = objectsToSheetRowsPublic(
      filteredI,
      SHEET_HEADERS.SALE_ITEMS,
    );
    const padded = padValuesPublic(
      values,
      SHEET_HEADERS.SALE_ITEMS.length,
      allItems.length,
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `SaleItems!A2:H`,
      valueInputOption: "RAW",
      requestBody: { values: padded },
    });
  }

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueSaleSync(
  userId: string,
  spreadsheetId: string,
  saleId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncSaleToSheet(userId, spreadsheetId, saleId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessSale
        .update({
          where: { id: saleId },
          data: { syncStatus: "FAILED", syncError: "Queue error" },
        })
        .catch(() => {});
    });
}

export function enqueueSaleDeleteSync(
  userId: string,
  spreadsheetId: string,
  saleId: string,
): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncSaleDeleteToSheet(userId, spreadsheetId, saleId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(() => {});
}

// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export async function importConfigFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEET_RANGES.CONFIG,
    });

    const rows = sheetRowsToObjectsPublic(
      res.data.values as string[][] | null,
      SHEET_HEADERS.CONFIG,
    ) as any[];

    const configMap: Record<string, any> = {};
    rows
      .filter((r) => r.key != null && r.key !== "")
      .forEach((r) => {
        configMap[String(r.key)] = String(r.value ?? "");
      });

    if (Object.keys(configMap).length === 0) return false;

    await prisma.businessConfig.upsert({
      where: { sheetConnectionId },
      update: {
        businessName: configMap.businessName ?? undefined,
        logoUrl: configMap.logoUrl ?? undefined,
        address: configMap.address ?? undefined,
        phone: configMap.phone ?? undefined,
        email: configMap.email ?? undefined,
        website: configMap.website ?? undefined,
        taxNumber: configMap.taxNumber ?? undefined,
        currency: configMap.currency ?? undefined,
        currencySymbol: configMap.currencySymbol ?? undefined,
        paymentQrUrl: configMap.paymentQrUrl ?? undefined,
        invoicePrefix: configMap.invoicePrefix ?? undefined,
        invoiceFooter: configMap.invoiceFooter ?? undefined,
        lowStockThreshold: configMap.lowStockThreshold ?? undefined,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
        syncError: null,
      },
      create: {
        sheetConnectionId,
        externalSheetId: spreadsheetId,
        businessName: configMap.businessName ?? null,
        logoUrl: configMap.logoUrl ?? null,
        address: configMap.address ?? null,
        phone: configMap.phone ?? null,
        email: configMap.email ?? null,
        website: configMap.website ?? null,
        taxNumber: configMap.taxNumber ?? null,
        currency: configMap.currency ?? null,
        currencySymbol: configMap.currencySymbol ?? null,
        paymentQrUrl: configMap.paymentQrUrl ?? null,
        invoicePrefix: configMap.invoicePrefix ?? null,
        invoiceFooter: configMap.invoiceFooter ?? null,
        lowStockThreshold: configMap.lowStockThreshold ?? null,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });

    await invalidateSpreadsheetCache(spreadsheetId);
    return true;
  } catch (err) {
    console.warn("[Sync] Could not read config sheet:", err);
    return false;
  }
}

export async function syncConfigToSheet(
  userId: string,
  spreadsheetId: string,
): Promise<void> {
  const dbConfig = await prisma.businessConfig.findUnique({
    where: { externalSheetId: spreadsheetId },
  });
  if (!dbConfig) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGES.CONFIG,
  });

  const rows = sheetRowsToObjectsPublic(
    res.data.values as string[][] | null,
    SHEET_HEADERS.CONFIG,
  ) as any[];

  const configMap: Record<string, string> = {};
  rows
    .filter((r) => r.key != null && r.key !== "")
    .forEach((r) => {
      configMap[String(r.key)] = String(r.value ?? "");
    });

  // Update all keys from DB
  const allKeys = [
    "businessName",
    "logoUrl",
    "address",
    "phone",
    "email",
    "website",
    "taxNumber",
    "currency",
    "currencySymbol",
    "paymentQrUrl",
    "invoicePrefix",
    "invoiceFooter",
    "lowStockThreshold",
  ];

  for (const key of allKeys) {
    const value = (dbConfig as any)[key];
    configMap[key] = value ?? "";
  }

  const values = Object.entries(configMap).map(([k, v]) => [k, v]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `_Config!A2:B`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  await prisma.businessConfig.update({
    where: { externalSheetId: spreadsheetId },
    data: {
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
      syncError: null,
    },
  });

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueConfigSync(userId: string, spreadsheetId: string): void {
  sheetsQueue
    .enqueue({
      userId,
      type: "WRITE",
      priority: "HIGH",
      operation: () => syncConfigToSheet(userId, spreadsheetId),
      resolve: () => {},
      reject: () => {},
    })
    .catch(async () => {
      await prisma.businessConfig
        .update({
          where: { externalSheetId: spreadsheetId },
          data: { syncStatus: "FAILED", syncError: "Queue error" },
        })
        .catch(() => {});
    });
}

// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function importOrdersFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string
): Promise<number> {
  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const [oRes, oiRes, dRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGES.ORDERS }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGES.ORDER_ITEMS }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGES.DELIVERIES }),
    ]);

    const orders = sheetRowsToObjectsPublic(
      oRes.data.values as string[][] | null, SHEET_HEADERS.ORDERS
    ) as any[];
    const orderItems = sheetRowsToObjectsPublic(
      oiRes.data.values as string[][] | null, SHEET_HEADERS.ORDER_ITEMS
    ) as any[];
    const deliveries = sheetRowsToObjectsPublic(
      dRes.data.values as string[][] | null, SHEET_HEADERS.DELIVERIES
    ) as any[];

    if (orders.length === 0) return 0;

    for (const o of orders) {
      await prisma.businessOrder.upsert({
        where: { sheetConnectionId_id: { sheetConnectionId, id: o.id } },
        update: {
          orderNumber: o.orderNumber,
          date: o.date,
          customerId: o.customerId,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerAddress: o.customerAddress,
          subtotal: Number(o.subtotal) || 0,
          deliveryFee: Number(o.deliveryFee) || 0,
          discountAmount: Number(o.discountAmount) || 0,
          total: Number(o.total) || 0,
          amountPaid: Number(o.amountPaid) || 0,
          amountDue: Number(o.amountDue) || 0,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus || 'UNPAID',
          status: o.status || 'PENDING',
          notes: o.notes,
          confirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : null,
          packedAt: o.packedAt ? new Date(o.packedAt) : null,
          dispatchedAt: o.dispatchedAt ? new Date(o.dispatchedAt) : null,
          deliveredAt: o.deliveredAt ? new Date(o.deliveredAt) : null,
          cancelledAt: o.cancelledAt ? new Date(o.cancelledAt) : null,
          returnedAt: o.returnedAt ? new Date(o.returnedAt) : null,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
        create: {
          id: o.id,
          sheetConnectionId,
          externalSheetId: spreadsheetId,
          orderNumber: o.orderNumber,
          date: o.date,
          customerId: o.customerId,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerAddress: o.customerAddress,
          subtotal: Number(o.subtotal) || 0,
          deliveryFee: Number(o.deliveryFee) || 0,
          discountAmount: Number(o.discountAmount) || 0,
          total: Number(o.total) || 0,
          amountPaid: Number(o.amountPaid) || 0,
          amountDue: Number(o.amountDue) || 0,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus || 'UNPAID',
          status: o.status || 'PENDING',
          notes: o.notes,
          confirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : null,
          packedAt: o.packedAt ? new Date(o.packedAt) : null,
          dispatchedAt: o.dispatchedAt ? new Date(o.dispatchedAt) : null,
          deliveredAt: o.deliveredAt ? new Date(o.deliveredAt) : null,
          cancelledAt: o.cancelledAt ? new Date(o.cancelledAt) : null,
          returnedAt: o.returnedAt ? new Date(o.returnedAt) : null,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      // Items
      await prisma.businessOrderItem.deleteMany({ where: { orderId: o.id } });
      const items = orderItems.filter(i => i.orderId === o.id);
      if (items.length > 0) {
        await prisma.businessOrderItem.createMany({
          data: items.map(i => ({
            id: i.id,
            orderId: o.id,
            productId: i.productId,
            productName: i.productName,
            variation: i.variation || null,
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            total: Number(i.total) || 0,
          })),
          skipDuplicates: true,
        });
      }

      // Delivery
      const delivery = deliveries.find(d => d.orderId === o.id);
      if (delivery) {
        await prisma.businessDelivery.upsert({
          where: { orderId: o.id },
          update: {
            agentType: delivery.agentType || 'STAFF',
            agentName: delivery.agentName,
            agentPhone: delivery.agentPhone,
            courierName: delivery.courierName,
            trackingCode: delivery.trackingCode,
            deliveryFee: Number(delivery.deliveryFee) || 0,
            notes: delivery.notes,
            deliveredAt: delivery.deliveredAt ? new Date(delivery.deliveredAt) : null,
          },
          create: {
            id: delivery.id || `DEL_${o.id}`,
            orderId: o.id,
            agentType: delivery.agentType || 'STAFF',
            agentName: delivery.agentName,
            agentPhone: delivery.agentPhone,
            courierName: delivery.courierName,
            trackingCode: delivery.trackingCode,
            deliveryFee: Number(delivery.deliveryFee) || 0,
            notes: delivery.notes,
            assignedAt: delivery.assignedAt ? new Date(delivery.assignedAt) : new Date(),
            deliveredAt: delivery.deliveredAt ? new Date(delivery.deliveredAt) : null,
          },
        });
      }
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return orders.length;
  } catch (err) {
    console.warn('[Sync] Could not read orders sheet:', err);
    return 0;
  }
}

export async function syncOrderToSheet(
  userId: string,
  spreadsheetId: string,
  orderId: string
): Promise<void> {
  const dbOrder = await prisma.businessOrder.findUnique({
    where: { id: orderId },
    include: { items: true, delivery: true },
  });
  if (!dbOrder) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Sync order row
  const oRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.ORDERS,
  });
  const allOrders = sheetRowsToObjectsPublic(
    oRes.data.values as string[][] | null, SHEET_HEADERS.ORDERS
  ) as any[];

  const sheetOrder = {
    id: dbOrder.id,
    orderNumber: dbOrder.orderNumber,
    date: dbOrder.date,
    customerId: dbOrder.customerId,
    customerName: dbOrder.customerName,
    customerPhone: dbOrder.customerPhone,
    customerAddress: dbOrder.customerAddress,
    subtotal: dbOrder.subtotal,
    deliveryFee: dbOrder.deliveryFee,
    discountAmount: dbOrder.discountAmount,
    total: dbOrder.total,
    amountPaid: dbOrder.amountPaid,
    amountDue: dbOrder.amountDue,
    paymentMethod: dbOrder.paymentMethod,
    paymentStatus: dbOrder.paymentStatus,
    status: dbOrder.status,
    notes: dbOrder.notes,
    confirmedAt: dbOrder.confirmedAt?.toISOString() ?? '',
    packedAt: dbOrder.packedAt?.toISOString() ?? '',
    dispatchedAt: dbOrder.dispatchedAt?.toISOString() ?? '',
    deliveredAt: dbOrder.deliveredAt?.toISOString() ?? '',
    cancelledAt: dbOrder.cancelledAt?.toISOString() ?? '',
    returnedAt: dbOrder.returnedAt?.toISOString() ?? '',
    createdAt: dbOrder.createdAt.toISOString(),
  };

  const oIdx = allOrders.findIndex(o => o.id === dbOrder.id);
  if (oIdx === -1) {
    const values = objectsToSheetRowsPublic([sheetOrder], SHEET_HEADERS.ORDERS);
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `Orders!A:X`,
      valueInputOption: 'RAW', requestBody: { values },
    });
  } else {
    allOrders[oIdx] = sheetOrder;
    const values = objectsToSheetRowsPublic(allOrders, SHEET_HEADERS.ORDERS);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `Orders!A2:X`,
      valueInputOption: 'RAW', requestBody: { values },
    });
  }

  // Sync order items
  const oiRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.ORDER_ITEMS,
  });
  const allOrderItems = sheetRowsToObjectsPublic(
    oiRes.data.values as string[][] | null, SHEET_HEADERS.ORDER_ITEMS
  ) as any[];
  const otherItems = allOrderItems.filter(i => i.orderId !== dbOrder.id);
  const newItems = dbOrder.items.map(i => ({
    id: i.id, orderId: dbOrder.id,
    productId: i.productId, productName: i.productName,
    variation: i.variation, quantity: i.quantity,
    unitPrice: i.unitPrice, total: i.total,
  }));
  const mergedItems = [...otherItems, ...newItems];
  const itemValues = objectsToSheetRowsPublic(mergedItems, SHEET_HEADERS.ORDER_ITEMS);
  const paddedItems = padValuesPublic(
    itemValues, SHEET_HEADERS.ORDER_ITEMS.length,
    Math.max(allOrderItems.length, mergedItems.length)
  );
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `OrderItems!A2:H`,
    valueInputOption: 'RAW', requestBody: { values: paddedItems },
  });

  // Sync delivery if exists
  if (dbOrder.delivery) {
    const dRes = await sheets.spreadsheets.values.get({
      spreadsheetId, range: SHEET_RANGES.DELIVERIES,
    });
    const allDeliveries = sheetRowsToObjectsPublic(
      dRes.data.values as string[][] | null, SHEET_HEADERS.DELIVERIES
    ) as any[];
    const d = dbOrder.delivery;
    const sheetDelivery = {
      id: d.id, orderId: d.orderId,
      agentType: d.agentType, agentName: d.agentName,
      agentPhone: d.agentPhone, courierName: d.courierName,
      trackingCode: d.trackingCode, deliveryFee: d.deliveryFee,
      notes: d.notes,
      assignedAt: d.assignedAt.toISOString(),
      deliveredAt: d.deliveredAt?.toISOString() ?? '',
    };
    const dIdx = allDeliveries.findIndex(x => x.orderId === dbOrder.id);
    if (dIdx === -1) {
      const values = objectsToSheetRowsPublic([sheetDelivery], SHEET_HEADERS.DELIVERIES);
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `Deliveries!A:K`,
        valueInputOption: 'RAW', requestBody: { values },
      });
    } else {
      allDeliveries[dIdx] = sheetDelivery;
      const values = objectsToSheetRowsPublic(allDeliveries, SHEET_HEADERS.DELIVERIES);
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `Deliveries!A2:K`,
        valueInputOption: 'RAW', requestBody: { values },
      });
    }
  }

  await prisma.businessOrder.update({
    where: { id: orderId },
    data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED', syncError: null },
  });
  await invalidateSpreadsheetCache(spreadsheetId);
}

export async function syncOrderDeleteToSheet(
  userId: string,
  spreadsheetId: string,
  orderId: string
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const oRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.ORDERS,
  });
  const allOrders = sheetRowsToObjectsPublic(
    oRes.data.values as string[][] | null, SHEET_HEADERS.ORDERS
  ) as any[];
  const filtered = allOrders.filter(o => o.id !== orderId);
  if (filtered.length < allOrders.length) {
    const values = objectsToSheetRowsPublic(filtered, SHEET_HEADERS.ORDERS);
    const padded = padValuesPublic(values, SHEET_HEADERS.ORDERS.length, allOrders.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `Orders!A2:X`,
      valueInputOption: 'RAW', requestBody: { values: padded },
    });
  }

  const oiRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.ORDER_ITEMS,
  });
  const allItems = sheetRowsToObjectsPublic(
    oiRes.data.values as string[][] | null, SHEET_HEADERS.ORDER_ITEMS
  ) as any[];
  const filteredItems = allItems.filter(i => i.orderId !== orderId);
  if (filteredItems.length < allItems.length) {
    const values = objectsToSheetRowsPublic(filteredItems, SHEET_HEADERS.ORDER_ITEMS);
    const padded = padValuesPublic(values, SHEET_HEADERS.ORDER_ITEMS.length, allItems.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `OrderItems!A2:H`,
      valueInputOption: 'RAW', requestBody: { values: padded },
    });
  }

  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueOrderSync(userId: string, spreadsheetId: string, orderId: string): void {
  sheetsQueue.enqueue({
    userId, type: 'WRITE', priority: 'HIGH',
    operation: () => syncOrderToSheet(userId, spreadsheetId, orderId),
    resolve: () => {}, reject: () => {},
  }).catch(async () => {
    await prisma.businessOrder.update({
      where: { id: orderId },
      data: { syncStatus: 'FAILED', syncError: 'Queue error' },
    }).catch(() => {});
  });
}

export function enqueueOrderDeleteSync(userId: string, spreadsheetId: string, orderId: string): void {
  sheetsQueue.enqueue({
    userId, type: 'WRITE', priority: 'HIGH',
    operation: () => syncOrderDeleteToSheet(userId, spreadsheetId, orderId),
    resolve: () => {}, reject: () => {},
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// RETURNS
// ─────────────────────────────────────────────────────────────────────────────

export async function importReturnsFromSheet(
  userId: string,
  sheetConnectionId: string,
  spreadsheetId: string
): Promise<number> {
  try {
    const auth = await getOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const [rRes, riRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGES.RETURNS }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGES.RETURN_ITEMS }),
    ]);

    const returns = sheetRowsToObjectsPublic(
      rRes.data.values as string[][] | null, SHEET_HEADERS.RETURNS
    ) as any[];
    const returnItems = sheetRowsToObjectsPublic(
      riRes.data.values as string[][] | null, SHEET_HEADERS.RETURN_ITEMS
    ) as any[];

    if (returns.length === 0) return 0;

    for (const r of returns) {
      await prisma.businessReturn.upsert({
        where: { sheetConnectionId_id: { sheetConnectionId, id: r.id } },
        update: {
          returnNumber: r.returnNumber,
          returnType: r.returnType,
          date: r.date,
          saleId: r.saleId, saleInvoice: r.saleInvoice,
          customerId: r.customerId, customerName: r.customerName,
          purchaseId: r.purchaseId, purchaseInvoice: r.purchaseInvoice,
          supplierId: r.supplierId, supplierName: r.supplierName,
          reason: r.reason, notes: r.notes,
          status: r.status || 'PENDING',
          totalValue: Number(r.totalValue) || 0,
          refundAmount: Number(r.refundAmount) || 0,
          refundMethod: r.refundMethod,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
        create: {
          id: r.id,
          sheetConnectionId,
          externalSheetId: spreadsheetId,
          returnNumber: r.returnNumber,
          returnType: r.returnType,
          date: r.date,
          saleId: r.saleId, saleInvoice: r.saleInvoice,
          customerId: r.customerId, customerName: r.customerName,
          purchaseId: r.purchaseId, purchaseInvoice: r.purchaseInvoice,
          supplierId: r.supplierId, supplierName: r.supplierName,
          reason: r.reason, notes: r.notes,
          status: r.status || 'PENDING',
          totalValue: Number(r.totalValue) || 0,
          refundAmount: Number(r.refundAmount) || 0,
          refundMethod: r.refundMethod,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      await prisma.businessReturnItem.deleteMany({ where: { returnId: r.id } });
      const items = returnItems.filter(i => i.returnId === r.id);
      if (items.length > 0) {
        await prisma.businessReturnItem.createMany({
          data: items.map(i => ({
            id: i.id, returnId: r.id,
            productId: i.productId, productName: i.productName,
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            total: Number(i.total) || 0,
            condition: i.condition || 'DAMAGED',
          })),
          skipDuplicates: true,
        });
      }
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return returns.length;
  } catch (err) {
    console.warn('[Sync] Could not read returns sheet:', err);
    return 0;
  }
}

export async function syncReturnToSheet(
  userId: string,
  spreadsheetId: string,
  returnId: string
): Promise<void> {
  const dbReturn = await prisma.businessReturn.findUnique({
    where: { id: returnId },
    include: { items: true },
  });
  if (!dbReturn) return;

  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const rRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.RETURNS,
  });
  const allReturns = sheetRowsToObjectsPublic(
    rRes.data.values as string[][] | null, SHEET_HEADERS.RETURNS
  ) as any[];

  const sheetReturn = {
    id: dbReturn.id, returnNumber: dbReturn.returnNumber,
    returnType: dbReturn.returnType, date: dbReturn.date,
    saleId: dbReturn.saleId, saleInvoice: dbReturn.saleInvoice,
    customerId: dbReturn.customerId, customerName: dbReturn.customerName,
    purchaseId: dbReturn.purchaseId, purchaseInvoice: dbReturn.purchaseInvoice,
    supplierId: dbReturn.supplierId, supplierName: dbReturn.supplierName,
    reason: dbReturn.reason, notes: dbReturn.notes,
    status: dbReturn.status,
    totalValue: dbReturn.totalValue, refundAmount: dbReturn.refundAmount,
    refundMethod: dbReturn.refundMethod,
    createdAt: dbReturn.createdAt.toISOString(),
  };

  const rIdx = allReturns.findIndex(r => r.id === dbReturn.id);
  if (rIdx === -1) {
    const values = objectsToSheetRowsPublic([sheetReturn], SHEET_HEADERS.RETURNS);
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `Returns!A:S`,
      valueInputOption: 'RAW', requestBody: { values },
    });
  } else {
    allReturns[rIdx] = sheetReturn;
    const values = objectsToSheetRowsPublic(allReturns, SHEET_HEADERS.RETURNS);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `Returns!A2:S`,
      valueInputOption: 'RAW', requestBody: { values },
    });
  }

  const riRes = await sheets.spreadsheets.values.get({
    spreadsheetId, range: SHEET_RANGES.RETURN_ITEMS,
  });
  const allReturnItems = sheetRowsToObjectsPublic(
    riRes.data.values as string[][] | null, SHEET_HEADERS.RETURN_ITEMS
  ) as any[];
  const otherItems = allReturnItems.filter(i => i.returnId !== dbReturn.id);
  const newItems = dbReturn.items.map(i => ({
    id: i.id, returnId: dbReturn.id,
    productId: i.productId, productName: i.productName,
    quantity: i.quantity, unitPrice: i.unitPrice,
    total: i.total, condition: i.condition,
  }));
  const merged = [...otherItems, ...newItems];
  const riValues = objectsToSheetRowsPublic(merged, SHEET_HEADERS.RETURN_ITEMS);
  const riPadded = padValuesPublic(
    riValues, SHEET_HEADERS.RETURN_ITEMS.length,
    Math.max(allReturnItems.length, merged.length)
  );
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `ReturnItems!A2:H`,
    valueInputOption: 'RAW', requestBody: { values: riPadded },
  });

  await prisma.businessReturn.update({
    where: { id: returnId },
    data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED', syncError: null },
  });
  await invalidateSpreadsheetCache(spreadsheetId);
}

export function enqueueReturnSync(userId: string, spreadsheetId: string, returnId: string): void {
  sheetsQueue.enqueue({
    userId, type: 'WRITE', priority: 'HIGH',
    operation: () => syncReturnToSheet(userId, spreadsheetId, returnId),
    resolve: () => {}, reject: () => {},
  }).catch(async () => {
    await prisma.businessReturn.update({
      where: { id: returnId },
      data: { syncStatus: 'FAILED', syncError: 'Queue error' },
    }).catch(() => {});
  });
}