// lib/google-sheet-inventory.ts

import { google } from 'googleapis';
import { getOAuth2Client } from './google-sheet';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'CASH' | 'WALLET' | 'BANK' | 'CREDIT';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  amountPaid: number;
  amountDue: number;
  notes: string;
  createdAt: string;
  items: SaleItem[];
}

// Headers for each sheet
const PRODUCT_HEADERS = [
  'ID', 'Name', 'SKU', 'Category', 'Description', 
  'CostPrice', 'SellingPrice', 'Stock', 'MinStock', 'Unit', 
  'CreatedAt', 'UpdatedAt'
];

const CUSTOMER_HEADERS = [
  'ID', 'Name', 'Phone', 'Email', 'Address', 'City', 'Notes', 'CreatedAt'
];

const SALE_HEADERS = [
  'ID', 'InvoiceNumber', 'Date', 'CustomerID', 'CustomerName', 'CustomerPhone',
  'Subtotal', 'DiscountPercent', 'DiscountAmount', 'TaxPercent', 'TaxAmount', 'Total',
  'PaymentMethod', 'PaymentStatus', 'AmountPaid', 'AmountDue', 'Notes', 'CreatedAt'
];

const SALE_ITEM_HEADERS = [
  'ID', 'SaleID', 'ProductID', 'ProductName', 'Quantity', 'UnitPrice', 'Discount', 'Total'
];

// ═══════════════════════════════════════════════════
// CREATE INVENTORY SPREADSHEET
// ═══════════════════════════════════════════════════

export async function createInventorySpreadsheet(
  userId: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Create spreadsheet with 4 sheets
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: 'Products', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Customers', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Sales', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'SaleItems', gridProperties: { frozenRowCount: 1 } } },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;
  const sheetIds = response.data.sheets?.map(s => ({
    title: s.properties?.title,
    sheetId: s.properties?.sheetId
  })) || [];

  // Add headers to all sheets
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: 'Products!A1:L1', values: [PRODUCT_HEADERS] },
        { range: 'Customers!A1:H1', values: [CUSTOMER_HEADERS] },
        { range: 'Sales!A1:R1', values: [SALE_HEADERS] },
        { range: 'SaleItems!A1:H1', values: [SALE_ITEM_HEADERS] },
      ],
    },
  });

  // Format header rows
  const formatRequests = sheetIds.map(sheet => ({
    repeatCell: {
      range: {
        sheetId: sheet.sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.1, green: 0.4, blue: 0.7 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  }));

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests },
    });
  } catch (error) {
    console.warn('Failed to format headers:', error);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

// ═══════════════════════════════════════════════════
// PRODUCT FUNCTIONS
// ═══════════════════════════════════════════════════

export async function readProducts(userId: string, spreadsheetId: string): Promise<Product[]> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Products!A2:L',
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    sku: row[2] || '',
    category: row[3] || '',
    description: row[4] || '',
    costPrice: parseFloat(row[5]) || 0,
    sellingPrice: parseFloat(row[6]) || 0,
    stock: parseInt(row[7]) || 0,
    minStock: parseInt(row[8]) || 0,
    unit: row[9] || 'pcs',
    createdAt: row[10] || '',
    updatedAt: row[11] || '',
  })).filter(p => p.id);
}

export async function appendProduct(
  userId: string,
  spreadsheetId: string,
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const id = `PRD-${Date.now()}`;
  const now = new Date().toISOString();

  const row = [
    id,
    product.name,
    product.sku,
    product.category,
    product.description,
    product.costPrice,
    product.sellingPrice,
    product.stock,
    product.minStock,
    product.unit,
    now,
    now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Products!A:L',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { id, ...product, createdAt: now, updatedAt: now };
}

export async function updateProduct(
  userId: string,
  spreadsheetId: string,
  productId: string,
  updates: Partial<Product>
): Promise<Product | null> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const products = await readProducts(userId, spreadsheetId);
  const index = products.findIndex(p => p.id === productId);

  if (index === -1) return null;

  const rowNumber = index + 2;
  const now = new Date().toISOString();
  const updated = { ...products[index], ...updates, id: productId, updatedAt: now };

  const row = [
    updated.id,
    updated.name,
    updated.sku,
    updated.category,
    updated.description,
    updated.costPrice,
    updated.sellingPrice,
    updated.stock,
    updated.minStock,
    updated.unit,
    updated.createdAt,
    updated.updatedAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Products!A${rowNumber}:L${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return updated;
}

export async function deleteProduct(
  userId: string,
  spreadsheetId: string,
  productId: string
): Promise<boolean> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const products = await readProducts(userId, spreadsheetId);
  const index = products.findIndex(p => p.id === productId);

  if (index === -1) return false;

  const rowNumber = index + 2;

  // Get sheet ID
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const productSheet = metadata.data.sheets?.find(s => s.properties?.title === 'Products');
  if (!productSheet?.properties?.sheetId) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: productSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }],
    },
  });

  return true;
}

export async function updateProductStock(
  userId: string,
  spreadsheetId: string,
  productId: string,
  quantityChange: number
): Promise<boolean> {
  const products = await readProducts(userId, spreadsheetId);
  const product = products.find(p => p.id === productId);

  if (!product) return false;

  const newStock = product.stock + quantityChange;
  await updateProduct(userId, spreadsheetId, productId, { stock: newStock });

  return true;
}

// ═══════════════════════════════════════════════════
// CUSTOMER FUNCTIONS
// ═══════════════════════════════════════════════════

export async function readCustomers(userId: string, spreadsheetId: string): Promise<Customer[]> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Customers!A2:H',
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    phone: row[2] || '',
    email: row[3] || '',
    address: row[4] || '',
    city: row[5] || '',
    notes: row[6] || '',
    createdAt: row[7] || '',
  })).filter(c => c.id);
}

export async function appendCustomer(
  userId: string,
  spreadsheetId: string,
  customer: Omit<Customer, 'id' | 'createdAt'>
): Promise<Customer> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const id = `CUS-${Date.now()}`;
  const now = new Date().toISOString();

  const row = [
    id,
    customer.name,
    customer.phone,
    customer.email,
    customer.address,
    customer.city,
    customer.notes,
    now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Customers!A:H',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { id, ...customer, createdAt: now };
}

export async function updateCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string,
  updates: Partial<Customer>
): Promise<Customer | null> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const customers = await readCustomers(userId, spreadsheetId);
  const index = customers.findIndex(c => c.id === customerId);

  if (index === -1) return null;

  const rowNumber = index + 2;
  const updated = { ...customers[index], ...updates, id: customerId };

  const row = [
    updated.id,
    updated.name,
    updated.phone,
    updated.email,
    updated.address,
    updated.city,
    updated.notes,
    updated.createdAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Customers!A${rowNumber}:H${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return updated;
}

export async function deleteCustomer(
  userId: string,
  spreadsheetId: string,
  customerId: string
): Promise<boolean> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const customers = await readCustomers(userId, spreadsheetId);
  const index = customers.findIndex(c => c.id === customerId);

  if (index === -1) return false;

  const rowNumber = index + 2;

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const customerSheet = metadata.data.sheets?.find(s => s.properties?.title === 'Customers');
  if (!customerSheet?.properties?.sheetId) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: customerSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }],
    },
  });

  return true;
}

// ═══════════════════════════════════════════════════
// SALES / INVOICE FUNCTIONS
// ═══════════════════════════════════════════════════

export async function readSales(userId: string, spreadsheetId: string): Promise<Sale[]> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Read sales
  const salesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sales!A2:R',
  });

  // Read sale items
  const itemsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SaleItems!A2:H',
  });

  const salesRows = salesResponse.data.values || [];
  const itemsRows = itemsResponse.data.values || [];

  // Parse items
  const itemsBySale: Record<string, SaleItem[]> = {};
  itemsRows.forEach((row) => {
    const saleId = row[1];
    if (!saleId) return;
    
    if (!itemsBySale[saleId]) {
      itemsBySale[saleId] = [];
    }
    
    itemsBySale[saleId].push({
      productId: row[2] || '',
      productName: row[3] || '',
      quantity: parseInt(row[4]) || 0,
      unitPrice: parseFloat(row[5]) || 0,
      discount: parseFloat(row[6]) || 0,
      total: parseFloat(row[7]) || 0,
    });
  });

  // Parse sales with items
  return salesRows.map((row) => {
    const id = row[0] || '';
    return {
      id,
      invoiceNumber: row[1] || '',
      date: row[2] || '',
      customerId: row[3] || '',
      customerName: row[4] || '',
      customerPhone: row[5] || '',
      subtotal: parseFloat(row[6]) || 0,
      discountPercent: parseFloat(row[7]) || 0,
      discountAmount: parseFloat(row[8]) || 0,
      taxPercent: parseFloat(row[9]) || 0,
      taxAmount: parseFloat(row[10]) || 0,
      total: parseFloat(row[11]) || 0,
      paymentMethod: (row[12] || 'CASH') as Sale['paymentMethod'],
      paymentStatus: (row[13] || 'UNPAID') as Sale['paymentStatus'],
      amountPaid: parseFloat(row[14]) || 0,
      amountDue: parseFloat(row[15]) || 0,
      notes: row[16] || '',
      createdAt: row[17] || '',
      items: itemsBySale[id] || [],
    };
  }).filter(s => s.id);
}

export async function readSaleById(
  userId: string,
  spreadsheetId: string,
  saleId: string
): Promise<Sale | null> {
  const sales = await readSales(userId, spreadsheetId);
  return sales.find(s => s.id === saleId) || null;
}

export async function createSale(
  userId: string,
  spreadsheetId: string,
  sale: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>
): Promise<Sale> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const id = `SAL-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Generate invoice number (INV-YYYYMMDD-XXX)
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const invoiceNumber = `INV-${dateStr}-${random}`;

  // Add sale header
  const saleRow = [
    id,
    invoiceNumber,
    sale.date,
    sale.customerId,
    sale.customerName,
    sale.customerPhone,
    sale.subtotal,
    sale.discountPercent,
    sale.discountAmount,
    sale.taxPercent,
    sale.taxAmount,
    sale.total,
    sale.paymentMethod,
    sale.paymentStatus,
    sale.amountPaid,
    sale.amountDue,
    sale.notes,
    now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sales!A:R',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [saleRow] },
  });

  // Add sale items
  if (sale.items && sale.items.length > 0) {
    const itemRows = sale.items.map((item, index) => [
      `ITM-${Date.now()}-${index}`,
      id,
      item.productId,
      item.productName,
      item.quantity,
      item.unitPrice,
      item.discount,
      item.total,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'SaleItems!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: itemRows },
    });

    // Update product stock (decrease)
    for (const item of sale.items) {
      await updateProductStock(userId, spreadsheetId, item.productId, -item.quantity);
    }
  }

  return { id, invoiceNumber, ...sale, createdAt: now };
}

export async function updateSalePayment(
  userId: string,
  spreadsheetId: string,
  saleId: string,
  amountPaid: number,
  paymentMethod: Sale['paymentMethod']
): Promise<Sale | null> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  const sales = await readSales(userId, spreadsheetId);
  const index = sales.findIndex(s => s.id === saleId);

  if (index === -1) return null;

  const sale = sales[index];
  const rowNumber = index + 2;

  const newAmountPaid = sale.amountPaid + amountPaid;
  const newAmountDue = sale.total - newAmountPaid;
  const newPaymentStatus: Sale['paymentStatus'] = 
    newAmountDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID';

  const updated = {
    ...sale,
    amountPaid: newAmountPaid,
    amountDue: Math.max(0, newAmountDue),
    paymentStatus: newPaymentStatus,
    paymentMethod,
  };

  const row = [
    updated.id,
    updated.invoiceNumber,
    updated.date,
    updated.customerId,
    updated.customerName,
    updated.customerPhone,
    updated.subtotal,
    updated.discountPercent,
    updated.discountAmount,
    updated.taxPercent,
    updated.taxAmount,
    updated.total,
    updated.paymentMethod,
    updated.paymentStatus,
    updated.amountPaid,
    updated.amountDue,
    updated.notes,
    updated.createdAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Sales!A${rowNumber}:R${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return updated;
}

export async function deleteSale(
  userId: string,
  spreadsheetId: string,
  saleId: string
): Promise<boolean> {
  const auth = await getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Get sale with items first (to restore stock)
  const sale = await readSaleById(userId, spreadsheetId, saleId);
  if (!sale) return false;

  // Read all sales to find row
  const sales = await readSales(userId, spreadsheetId);
  const saleIndex = sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) return false;

  // Get sheet IDs
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const salesSheet = metadata.data.sheets?.find(s => s.properties?.title === 'Sales');
  const itemsSheet = metadata.data.sheets?.find(s => s.properties?.title === 'SaleItems');

  if (!salesSheet?.properties?.sheetId) return false;

  // Delete sale row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: salesSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: saleIndex + 1, // +1 for header
            endIndex: saleIndex + 2,
          },
        },
      }],
    },
  });

  // Delete related sale items (if items sheet exists)
  if (itemsSheet?.properties?.sheetId) {
    // Read all items to find rows to delete
    const itemsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'SaleItems!A2:H',
    });

    const itemsRows = itemsResponse.data.values || [];
    const rowsToDelete: number[] = [];

    itemsRows.forEach((row, index) => {
      if (row[1] === saleId) {
        rowsToDelete.push(index + 2); // +2 for header and 1-based index
      }
    });

    // Delete from bottom to top to preserve indices
    for (const rowNum of rowsToDelete.reverse()) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: itemsSheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowNum - 1,
                endIndex: rowNum,
              },
            },
          }],
        },
      });
    }
  }

  // Restore product stock
  for (const item of sale.items) {
    await updateProductStock(userId, spreadsheetId, item.productId, item.quantity);
  }

  return true;
}

// ═══════════════════════════════════════════════════
// REPORTS / ANALYTICS FUNCTIONS
// ═══════════════════════════════════════════════════

export interface InventoryReport {
  totalProducts: number;
  totalStock: number;
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  stockValue: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  salesByPaymentMethod: Record<string, { count: number; amount: number }>;
  salesByStatus: Record<string, { count: number; amount: number }>;
  topProducts: { productName: string; quantity: number; revenue: number }[];
  recentSales: Sale[];
  monthlySales: { month: string; count: number; revenue: number }[];
}

export async function getInventoryReport(
  userId: string,
  spreadsheetId: string
): Promise<InventoryReport> {
  const [products, customers, sales] = await Promise.all([
    readProducts(userId, spreadsheetId),
    readCustomers(userId, spreadsheetId),
    readSales(userId, spreadsheetId),
  ]);

  // Product stats
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  const outOfStockProducts = products.filter(p => p.stock <= 0);
  const stockValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);

  // Sales stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalDue = sales.reduce((sum, s) => sum + s.amountDue, 0);

  // Sales by payment method
  const salesByPaymentMethod: Record<string, { count: number; amount: number }> = {};
  sales.forEach(s => {
    if (!salesByPaymentMethod[s.paymentMethod]) {
      salesByPaymentMethod[s.paymentMethod] = { count: 0, amount: 0 };
    }
    salesByPaymentMethod[s.paymentMethod].count++;
    salesByPaymentMethod[s.paymentMethod].amount += s.total;
  });

  // Sales by status
  const salesByStatus: Record<string, { count: number; amount: number }> = {};
  sales.forEach(s => {
    if (!salesByStatus[s.paymentStatus]) {
      salesByStatus[s.paymentStatus] = { count: 0, amount: 0 };
    }
    salesByStatus[s.paymentStatus].count++;
    salesByStatus[s.paymentStatus].amount += s.total;
  });

  // Top products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales)
    .map(p => ({ productName: p.name, quantity: p.quantity, revenue: p.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Recent sales
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Monthly sales
  const monthlyMap: Record<string, { count: number; revenue: number }> = {};
  sales.forEach(s => {
    const month = s.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap[month]) {
      monthlyMap[month] = { count: 0, revenue: 0 };
    }
    monthlyMap[month].count++;
    monthlyMap[month].revenue += s.total;
  });

  const monthlySales = Object.entries(monthlyMap)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.stock, 0),
    lowStockProducts,
    outOfStockProducts,
    stockValue,
    totalCustomers: customers.length,
    totalSales: sales.length,
    totalRevenue,
    totalPaid,
    totalDue,
    salesByPaymentMethod,
    salesByStatus,
    topProducts,
    recentSales,
    monthlySales,
  };
}