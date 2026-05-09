// lib/google-sheet-business.ts (COMPLETE REPLACEMENT)

import { getOAuth2Client } from '@/lib/google-sheet';
import { queueReadRequest, queueWriteRequest } from '@/lib/google-sheets-queue';
import {
  getOrFetch,
  invalidateSpreadsheetCache,
  getCacheKey,
  CACHE_PREFIX,
  CACHE_TTL,
} from '@/lib/cache';
import { google } from 'googleapis';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

export const TABS = {
  CONFIG: '_Config',
  SUPPLIERS: 'Suppliers',
  PRODUCTS: 'Products',
  CUSTOMERS: 'Customers',
  PURCHASES: 'Purchases',
  PURCHASE_ITEMS: 'PurchaseItems',
  SALES: 'Sales',
  SALE_ITEMS: 'SaleItems',
} as const;

export const HEADERS = {
  CONFIG: ['key', 'value'] as const,
  SUPPLIERS: [
    'id', 'name', 'phone', 'email', 'address', 'city',
    'contactPerson', 'paymentTerms', 'notes', 'createdAt',
  ] as const,
  PRODUCTS: [
    'id', 'name', 'sku', 'category', 'description',
    'costPrice', 'sellingPrice', 'stock', 'minStock',
    'unit', 'supplierId', 'supplierName', 'imageUrl',
    'createdAt', 'updatedAt',
  ] as const,
  CUSTOMERS: [
    'id', 'name', 'phone', 'email', 'address',
    'city', 'customerType', 'notes', 'createdAt',
  ] as const,
  PURCHASES: [
    'id', 'invoiceNumber', 'date', 'supplierId', 'supplierName',
    'subtotal', 'taxPercent', 'taxAmount', 'transportCost',
    'customsCost', 'storageCost', 'otherExpenses', 'landedCost',
    'total', 'amountPaid', 'amountDue', 'status', 'imageUrl',
    'notes', 'createdAt',
  ] as const,
  PURCHASE_ITEMS: [
    'id', 'purchaseId', 'productId', 'productName',
    'quantity', 'unitPrice', 'total',
  ] as const,
  SALES: [
    'id', 'invoiceNumber', 'date', 'customerId', 'customerName',
    'subtotal', 'discountType', 'discountValue', 'discountAmount',
    'taxPercent', 'taxAmount', 'total', 'amountPaid',
    'amountDue', 'paymentMethod', 'status', 'notes', 'createdAt',
  ] as const,
  SALE_ITEMS: [
    'id', 'saleId', 'productId', 'productName',
    'variation', 'quantity', 'unitPrice', 'total',
  ] as const,
} as const;

const RANGES = {
  CONFIG: `${TABS.CONFIG}!A2:B`,
  SUPPLIERS: `${TABS.SUPPLIERS}!A2:J`,
  PRODUCTS: `${TABS.PRODUCTS}!A2:O`,
  CUSTOMERS: `${TABS.CUSTOMERS}!A2:I`,
  PURCHASES: `${TABS.PURCHASES}!A2:T`,
  PURCHASE_ITEMS: `${TABS.PURCHASE_ITEMS}!A2:G`,
  SALES: `${TABS.SALES}!A2:S`,
  SALE_ITEMS: `${TABS.SALE_ITEMS}!A2:H`,
} as const;

const NUMERIC_FIELDS = new Set([
  'costPrice', 'sellingPrice', 'stock', 'minStock',
  'subtotal', 'taxPercent', 'taxAmount', 'total',
  'amountPaid', 'amountDue', 'quantity', 'unitPrice',
  'discountValue', 'discountAmount', 'transportCost',
  'customsCost', 'storageCost', 'otherExpenses', 'landedCost',
]);

const DATE_FIELDS = new Set([
  'createdAt', 'updatedAt', 'date',
]);

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

// ── async: must await getOAuth2Client ──────────────
async function makeSheetClient(userId: string) {
  const auth = await getOAuth2Client(userId);
  return google.sheets({ version: 'v4', auth });
}

function sheetRowsToObjects(
  data: string[][] | null | undefined,
  headers: readonly string[]
): Record<string, any>[] {
  if (!data || data.length === 0) return [];

  return data
    .filter(row => row.some(cell => cell !== '' && cell != null))
    .map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, i) => {
        const raw = row[i] ?? '';
        if (NUMERIC_FIELDS.has(header)) {
          obj[header] = raw === '' ? 0 : parseFloat(String(raw)) || 0;
        } else if (DATE_FIELDS.has(header)) {
          if (raw === '') {
            obj[header] = null;
          } else {
            const d = new Date(raw);
            obj[header] = isNaN(d.getTime()) ? raw : d.toISOString();
          }
        } else {
          obj[header] = raw === '' ? null : raw;
        }
      });
      return obj;
    })
    .filter(obj => obj.id != null && obj.id !== '');
}

function objectsToSheetRows(
  objects: Record<string, any>[],
  headers: readonly string[]
): string[][] {
  return objects.map(obj =>
    headers.map(h => {
      const val = obj[h];
      if (val == null) return '';
      if (val instanceof Date) return val.toISOString();
      return String(val);
    })
  );
}

function generateId(prefix: string, existing: Record<string, any>[]): string {
  if (existing.length === 0) return `${prefix}_1`;
  const nums = existing
    .map(r => parseInt(String(r.id ?? '').replace(`${prefix}_`, '') || '0'))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}_${max + 1}`;
}

function generateInvoiceNumber(
  prefix: string,
  existing: Record<string, any>[]
): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const count = existing.length + 1;
  return `${prefix}-${ymd}-${String(count).padStart(4, '0')}`;
}

function padValues(
  values: string[][],
  colCount: number,
  originalLength: number
): string[][] {
  const emptyRow = Array<string>(colCount).fill('');
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
  title: string
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
        ],
      },
    });

    const spreadsheetId = created.data.spreadsheetId!;
    const sheetMeta = created.data.sheets || [];

    const getSheetId = (tabName: string): number => {
      const found = sheetMeta.find(s => s.properties?.title === tabName);
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
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
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
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    }));

    const freezeRequests = headerEntries.map(({ tab }) => ({
      updateSheetProperties: {
        properties: {
          sheetId: getSheetId(tab),
          gridProperties: { frozenRowCount: 1 },
        },
        fields: 'gridProperties.frozenRowCount',
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
  spreadsheetId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = new Set(
      meta.data.sheets?.map(s => s.properties?.title ?? '') ?? []
    );

    const addSheetRequests = Object.values(TABS)
      .filter(tab => !existingTitles.has(tab))
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
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
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
  spreadsheetId: string
): Promise<Record<string, string>> {
  const cacheKey = getCacheKey(CACHE_PREFIX.METADATA, spreadsheetId, 'biz-config');
  return getOrFetch(
    cacheKey,
    async () => {
      const data = await queueReadRequest(userId, async () => {
        // ── await makeSheetClient ──
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
          .filter(r => r.key != null && r.key !== '')
          .map(r => [String(r.key), String(r.value ?? '')])
      );
    },
    CACHE_TTL.METADATA
  );
}

export async function updateConfig(
  userId: string,
  spreadsheetId: string,
  updates: Record<string, string>
): Promise<Record<string, string>> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGES.CONFIG,
    });
    const rows = sheetRowsToObjects(
      existing.data.values as string[][] | null,
      HEADERS.CONFIG
    );

    const configMap: Record<string, string> = Object.fromEntries(
      rows.filter(r => r.key).map(r => [String(r.key), String(r.value ?? '')])
    );
    Object.assign(configMap, updates);

    const values = Object.entries(configMap).map(([k, v]) => [k, v]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.CONFIG}!A2:B`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    await invalidateSpreadsheetCache(spreadsheetId);
    return configMap;
  });
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

export async function getSuppliers(
  userId: string,
  spreadsheetId: string
): Promise<Supplier[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId, 'biz-suppliers');
  return getOrFetch(
    cacheKey,
    async () => {
      const data = await queueReadRequest(userId, async () => {
        // ── await makeSheetClient ──
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.SUPPLIERS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.SUPPLIERS) as Supplier[];
    },
    CACHE_TTL.CUSTOMERS
  );
}

export async function createSupplier(
  userId: string,
  spreadsheetId: string,
  input: Omit<Supplier, 'id' | 'createdAt'>
): Promise<Supplier> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getSuppliers(userId, spreadsheetId);
    const newSupplier: Supplier = {
      id: generateId('SUP', all),
      createdAt: new Date().toISOString(),
      ...input,
    };
    const values = objectsToSheetRows([newSupplier], HEADERS.SUPPLIERS);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.SUPPLIERS}!A:J`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return newSupplier;
  });
}

export async function updateSupplier(
  userId: string,
  spreadsheetId: string,
  supplierId: string,
  updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>
): Promise<Supplier> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getSuppliers(userId, spreadsheetId);
    const idx = all.findIndex(s => s.id === supplierId);
    if (idx === -1) throw new Error('Supplier not found');
    all[idx] = { ...all[idx], ...updates };
    const values = objectsToSheetRows(all, HEADERS.SUPPLIERS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.SUPPLIERS}!A2:J`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return all[idx];
  });
}

export async function deleteSupplier(
  userId: string,
  spreadsheetId: string,
  supplierId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getSuppliers(userId, spreadsheetId);
    const filtered = all.filter(s => s.id !== supplierId);
    if (filtered.length === all.length) throw new Error('Supplier not found');
    const values = objectsToSheetRows(filtered, HEADERS.SUPPLIERS);
    const padded = padValues(values, HEADERS.SUPPLIERS.length, all.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.SUPPLIERS}!A2:J`,
      valueInputOption: 'RAW',
      requestBody: { values: padded },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
  });
}

// ═══════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════

export interface Product {
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
  createdAt: string;
  updatedAt: string;
}

export async function getProducts(
  userId: string,
  spreadsheetId: string
): Promise<Product[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.PRODUCTS, spreadsheetId, 'biz-products');
  return getOrFetch(
    cacheKey,
    async () => {
      const data = await queueReadRequest(userId, async () => {
        // ── await makeSheetClient ──
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.PRODUCTS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.PRODUCTS) as Product[];
    },
    CACHE_TTL.PRODUCTS
  );
}

export async function createProduct(
  userId: string,
  spreadsheetId: string,
  input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getProducts(userId, spreadsheetId);
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: generateId('PROD', all),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    const values = objectsToSheetRows([newProduct], HEADERS.PRODUCTS);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.PRODUCTS}!A:O`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return newProduct;
  });
}

export async function updateProduct(
  userId: string,
  spreadsheetId: string,
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getProducts(userId, spreadsheetId);
    const idx = all.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error('Product not found');
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    const values = objectsToSheetRows(all, HEADERS.PRODUCTS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.PRODUCTS}!A2:O`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return all[idx];
  });
}

export async function deleteProduct(
  userId: string,
  spreadsheetId: string,
  productId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getProducts(userId, spreadsheetId);
    const filtered = all.filter(p => p.id !== productId);
    if (filtered.length === all.length) throw new Error('Product not found');
    const values = objectsToSheetRows(filtered, HEADERS.PRODUCTS);
    const padded = padValues(values, HEADERS.PRODUCTS.length, all.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.PRODUCTS}!A2:O`,
      valueInputOption: 'RAW',
      requestBody: { values: padded },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
  });
}

// ─── Internal: deduct stock (called inside queueWriteRequest) ─────────────────

async function _rawDeductStock(
  userId: string,
  spreadsheetId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  // ── await makeSheetClient ──
  const sheets = await makeSheetClient(userId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });
  const all = sheetRowsToObjects(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS
  ) as Product[];

  for (const item of items) {
    const idx = all.findIndex(p => p.id === item.productId);
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
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function _rawRestoreStock(
  userId: string,
  spreadsheetId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  // ── await makeSheetClient ──
  const sheets = await makeSheetClient(userId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGES.PRODUCTS,
  });
  const all = sheetRowsToObjects(
    res.data.values as string[][] | null,
    HEADERS.PRODUCTS
  ) as Product[];

  for (const item of items) {
    const idx = all.findIndex(p => p.id === item.productId);
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
    valueInputOption: 'RAW',
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
  customerType: 'WALK_IN' | 'ONLINE';
  notes: string | null;
  createdAt: string;
}

export async function getCustomers(
  userId: string,
  spreadsheetId: string
): Promise<Customer[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.CUSTOMERS, spreadsheetId, 'biz-customers');
  return getOrFetch(
    cacheKey,
    async () => {
      const data = await queueReadRequest(userId, async () => {
        // ── await makeSheetClient ──
        const sheets = await makeSheetClient(userId);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: RANGES.CUSTOMERS,
        });
        return res.data.values as string[][];
      });
      return sheetRowsToObjects(data, HEADERS.CUSTOMERS) as Customer[];
    },
    CACHE_TTL.CUSTOMERS
  );
}

export async function createCustomer(
  userId: string,
  spreadsheetId: string,
  input: Omit<Customer, 'id' | 'createdAt'>
): Promise<Customer> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getCustomers(userId, spreadsheetId);
    const newCustomer: Customer = {
      id: generateId('CUST', all),
      createdAt: new Date().toISOString(),
      ...input,
    };
    const values = objectsToSheetRows([newCustomer], HEADERS.CUSTOMERS);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.CUSTOMERS}!A:I`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return newCustomer;
  });
}

export async function updateCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string,
  updates: Partial<Omit<Customer, 'id' | 'createdAt'>>
): Promise<Customer> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getCustomers(userId, spreadsheetId);
    const idx = all.findIndex(c => c.id === customerId);
    if (idx === -1) throw new Error('Customer not found');
    all[idx] = { ...all[idx], ...updates };
    const values = objectsToSheetRows(all, HEADERS.CUSTOMERS);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.CUSTOMERS}!A2:I`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return all[idx];
  });
}

export async function deleteCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getCustomers(userId, spreadsheetId);
    const filtered = all.filter(c => c.id !== customerId);
    if (filtered.length === all.length) throw new Error('Customer not found');
    const values = objectsToSheetRows(filtered, HEADERS.CUSTOMERS);
    const padded = padValues(values, HEADERS.CUSTOMERS.length, all.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.CUSTOMERS}!A2:I`,
      valueInputOption: 'RAW',
      requestBody: { values: padded },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
  });
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
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  items?: PurchaseItem[];
}

export async function getPurchases(
  userId: string,
  spreadsheetId: string
): Promise<Purchase[]> {
  const cacheKey = getCacheKey(
    CACHE_PREFIX.TRANSACTIONS,
    spreadsheetId,
    'biz-purchases'
  );
  return getOrFetch(
    cacheKey,
    async () => {
      const [purchaseData, itemData] = await queueReadRequest(
        userId,
        async () => {
          // ── await makeSheetClient ──
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
        }
      );

      const purchases = sheetRowsToObjects(
        purchaseData,
        HEADERS.PURCHASES
      ) as Purchase[];
      const items = sheetRowsToObjects(
        itemData,
        HEADERS.PURCHASE_ITEMS
      ) as PurchaseItem[];

      return purchases.map(p => ({
        ...p,
        items: items.filter(i => i.purchaseId === p.id),
      }));
    },
    CACHE_TTL.TRANSACTIONS
  );
}

export async function createPurchase(
  userId: string,
  spreadsheetId: string,
  input: Omit<Purchase, 'id' | 'invoiceNumber' | 'createdAt'> & {
    items: Omit<PurchaseItem, 'id' | 'purchaseId'>[];
  }
): Promise<Purchase> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const allPurchases = await getPurchases(userId, spreadsheetId);

    const newPurchase: Purchase = {
      id: generateId('PUR', allPurchases),
      invoiceNumber: generateInvoiceNumber('PUR', allPurchases),
      createdAt: new Date().toISOString(),
      ...input,
      items: undefined,
    };

    const purchaseValues = objectsToSheetRows([newPurchase], HEADERS.PURCHASES);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.PURCHASES}!A:T`,
      valueInputOption: 'RAW',
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
        HEADERS.PURCHASE_ITEMS
      );
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TABS.PURCHASE_ITEMS}!A:G`,
        valueInputOption: 'RAW',
        requestBody: { values: itemValues },
      });

      await _rawRestoreStock(userId, spreadsheetId, purchaseItems);
      newPurchase.items = purchaseItems;
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return newPurchase;
  });
}

export async function updatePurchaseStatus(
  userId: string,
  spreadsheetId: string,
  purchaseId: string,
  status: Purchase['status'],
  amountPaid: number
): Promise<Purchase> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getPurchases(userId, spreadsheetId);
    const idx = all.findIndex(p => p.id === purchaseId);
    if (idx === -1) throw new Error('Purchase not found');
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
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    await invalidateSpreadsheetCache(spreadsheetId);
    return all[idx];
  });
}

export async function deletePurchase(
  userId: string,
  spreadsheetId: string,
  purchaseId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const all = await getPurchases(userId, spreadsheetId);
    const purchase = all.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    const filtered = all.filter(p => p.id !== purchaseId);
    const purchaseValues = objectsToSheetRows(filtered, HEADERS.PURCHASES);
    const padded = padValues(
      purchaseValues,
      HEADERS.PURCHASES.length,
      all.length
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.PURCHASES}!A2:T`,
      valueInputOption: 'RAW',
      requestBody: { values: padded },
    });

    const iRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGES.PURCHASE_ITEMS,
    });
    const allItems = sheetRowsToObjects(
      iRes.data.values as string[][] | null,
      HEADERS.PURCHASE_ITEMS
    ) as PurchaseItem[];
    const toRemove = allItems.filter(i => i.purchaseId === purchaseId);
    const remainingItems = allItems.filter(i => i.purchaseId !== purchaseId);

    if (toRemove.length > 0) {
      await _rawDeductStock(userId, spreadsheetId, toRemove);
      const itemValues = objectsToSheetRows(
        remainingItems,
        HEADERS.PURCHASE_ITEMS
      );
      const paddedItems = padValues(
        itemValues,
        HEADERS.PURCHASE_ITEMS.length,
        allItems.length
      );
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.PURCHASE_ITEMS}!A2:G`,
        valueInputOption: 'RAW',
        requestBody: { values: paddedItems },
      });
    }

    await invalidateSpreadsheetCache(spreadsheetId);
  });
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
  discountType: 'PERCENT' | 'FIXED' | null;
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string | null;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes: string | null;
  createdAt: string;
  items?: SaleItem[];
}

export async function getSales(
  userId: string,
  spreadsheetId: string
): Promise<Sale[]> {
  const cacheKey = getCacheKey(CACHE_PREFIX.SALES, spreadsheetId, 'biz-sales');
  return getOrFetch(
    cacheKey,
    async () => {
      const [saleData, itemData] = await queueReadRequest(
        userId,
        async () => {
          // ── await makeSheetClient ──
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
          return [
            sRes.data.values as string[][],
            iRes.data.values as string[][],
          ];
        }
      );

      const sales = sheetRowsToObjects(saleData, HEADERS.SALES) as Sale[];
      const items = sheetRowsToObjects(
        itemData,
        HEADERS.SALE_ITEMS
      ) as SaleItem[];

      return sales.map(s => ({
        ...s,
        items: items.filter(i => i.saleId === s.id),
      }));
    },
    CACHE_TTL.SALES
  );
}

export async function createSale(
  userId: string,
  spreadsheetId: string,
  input: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'> & {
    items: Omit<SaleItem, 'id' | 'saleId'>[];
  }
): Promise<Sale> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const allSales = await getSales(userId, spreadsheetId);

    const newSale: Sale = {
      id: generateId('SAL', allSales),
      invoiceNumber: generateInvoiceNumber('INV', allSales),
      createdAt: new Date().toISOString(),
      ...input,
      items: undefined,
    };

    const saleValues = objectsToSheetRows([newSale], HEADERS.SALES);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.SALES}!A:S`,
      valueInputOption: 'RAW',
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
        valueInputOption: 'RAW',
        requestBody: { values: itemValues },
      });

      await _rawDeductStock(userId, spreadsheetId, saleItems);
      newSale.items = saleItems;
    }

    await invalidateSpreadsheetCache(spreadsheetId);
    return newSale;
  });
}

export async function deleteSale(
  userId: string,
  spreadsheetId: string,
  saleId: string
): Promise<void> {
  return queueWriteRequest(userId, async () => {
    // ── await makeSheetClient ──
    const sheets = await makeSheetClient(userId);
    const allSales = await getSales(userId, spreadsheetId);
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');

    const filtered = allSales.filter(s => s.id !== saleId);
    const saleValues = objectsToSheetRows(filtered, HEADERS.SALES);
    const padded = padValues(saleValues, HEADERS.SALES.length, allSales.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.SALES}!A2:S`,
      valueInputOption: 'RAW',
      requestBody: { values: padded },
    });

    const iRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGES.SALE_ITEMS,
    });
    const allItems = sheetRowsToObjects(
      iRes.data.values as string[][] | null,
      HEADERS.SALE_ITEMS
    ) as SaleItem[];
    const toRestore = allItems.filter(i => i.saleId === saleId);
    const remainingItems = allItems.filter(i => i.saleId !== saleId);

    if (toRestore.length > 0) {
      await _rawRestoreStock(userId, spreadsheetId, toRestore);
      const itemValues = objectsToSheetRows(
        remainingItems,
        HEADERS.SALE_ITEMS
      );
      const paddedItems = padValues(
        itemValues,
        HEADERS.SALE_ITEMS.length,
        allItems.length
      );
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SALE_ITEMS}!A2:H`,
        valueInputOption: 'RAW',
        requestBody: { values: paddedItems },
      });
    }

    await invalidateSpreadsheetCache(spreadsheetId);
  });
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
  spreadsheetId: string
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
  const grossMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const lowStockProducts = products.filter(
    p => p.stock <= p.minStock && p.minStock > 0
  );

  const salesByDateMap = new Map<string, { revenue: number; orders: number }>();
  sales.forEach(s => {
    const date = new Date(s.date).toISOString().split('T')[0];
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
  sales.forEach(s => {
    (s.items ?? []).forEach(item => {
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
  sales.forEach(s => {
    if (!s.customerId) return;
    const existing = custMap.get(s.customerId) ?? {
      customerName: s.customerName ?? 'Unknown',
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
  purchases.forEach(p => {
    if (!p.supplierId) return;
    const existing = supMap.get(p.supplierId) ?? {
      supplierName: p.supplierName ?? 'Unknown',
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
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10),
    recentPurchases: purchases
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10),
    customerSummary,
    supplierSummary,
  };
}