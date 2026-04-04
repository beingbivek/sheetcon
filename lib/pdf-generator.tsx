// lib/pdf-generator.tsx

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #3b82f6',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1 solid #e2e8f0',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottom: '1 solid #f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottom: '1 solid #e2e8f0',
  },
  col: {
    flex: 1,
  },
  colSmall: {
    width: 60,
  },
  colMedium: {
    width: 100,
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    marginTop: 20,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    color: '#64748b',
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2 solid #e2e8f0',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  income: {
    color: '#16a34a',
  },
  expense: {
    color: '#dc2626',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 5,
  },
  customerBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    marginBottom: 20,
    borderRadius: 4,
  },
  customerLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusPaid: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  statusUnpaid: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  statusPartial: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  alertBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    marginBottom: 15,
    borderRadius: 4,
    borderLeft: '3 solid #f59e0b',
  },
  alertText: {
    color: '#92400e',
    fontSize: 9,
  },
});

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// ═══════════════════════════════════════════════════
// FINANCE STATEMENT PDF
// ═══════════════════════════════════════════════════

interface FinanceTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
}

interface FinanceStatementProps {
  title: string;
  period: string;
  transactions: FinanceTransaction[];
  generatedAt: string;
}

const FinanceStatementDocument = ({ title, period, transactions, generatedAt }: FinanceStatementProps) => {
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Group by category
  const categoryTotals: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      categoryTotals[t.category].income += t.amount;
    } else {
      categoryTotals[t.category].expense += t.amount;
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Financial Statement • {period}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Net Balance</Text>
            <Text style={[styles.totalValue, balance >= 0 ? styles.income : styles.expense]}>
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.col, styles.bold]}>Category</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Income</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Expense</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Net</Text>
          </View>
          {Object.entries(categoryTotals).map(([category, totals]) => (
            <View key={category} style={styles.row}>
              <Text style={styles.col}>{category || 'Uncategorized'}</Text>
              <Text style={[styles.colMedium, styles.textRight, styles.income]}>
                {totals.income > 0 ? formatCurrency(totals.income) : '-'}
              </Text>
              <Text style={[styles.colMedium, styles.textRight, styles.expense]}>
                {totals.expense > 0 ? formatCurrency(totals.expense) : '-'}
              </Text>
              <Text style={[styles.colMedium, styles.textRight]}>
                {formatCurrency(totals.income - totals.expense)}
              </Text>
            </View>
          ))}
        </View>

        {/* Transactions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details ({transactions.length} transactions)</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.colSmall, styles.bold]}>Date</Text>
            <Text style={[styles.col, styles.bold]}>Description</Text>
            <Text style={[styles.colMedium, styles.bold]}>Category</Text>
            <Text style={[styles.colSmall, styles.textCenter, styles.bold]}>Type</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Amount</Text>
          </View>
          {transactions.slice(0, 50).map((t) => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.colSmall}>{formatDate(t.date)}</Text>
              <Text style={styles.col}>{t.description}</Text>
              <Text style={styles.colMedium}>{t.category}</Text>
              <Text style={[styles.colSmall, styles.textCenter]}>
                {t.type === 'income' ? '↑' : '↓'}
              </Text>
              <Text style={[styles.colMedium, styles.textRight, t.type === 'income' ? styles.income : styles.expense]}>
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
          {transactions.length > 50 && (
            <Text style={{ marginTop: 10, color: '#64748b', fontStyle: 'italic' }}>
              ... and {transactions.length - 50} more transactions
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by SheetCon • {formatDate(generatedAt)} • All data synced from Google Sheets
        </Text>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════
// INVOICE PDF
// ═══════════════════════════════════════════════════

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Sale {
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
  paymentMethod: string;
  paymentStatus: string;
  amountPaid: number;
  amountDue: number;
  notes: string;
  items: SaleItem[];
}

interface InvoicePDFProps {
  sale: Sale;
  businessName: string;
  generatedAt: string;
}

const InvoiceDocument = ({ sale, businessName, generatedAt }: InvoicePDFProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.title}>{businessName}</Text>
            <Text style={styles.subtitle}>Powered by SheetCon</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
            <Text style={{ marginTop: 5, color: '#64748b' }}>Date: {formatDate(sale.date)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerBox}>
          <Text style={styles.customerLabel}>BILL TO</Text>
          <Text style={styles.customerName}>{sale.customerName}</Text>
          {sale.customerPhone && <Text style={{ marginTop: 3 }}>Phone: {sale.customerPhone}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.colSmall, styles.bold]}>#</Text>
            <Text style={[styles.col, styles.bold]}>Item</Text>
            <Text style={[styles.colSmall, styles.textCenter, styles.bold]}>Qty</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Price</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Discount</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Total</Text>
          </View>
          {sale.items.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.colSmall}>{index + 1}</Text>
              <Text style={styles.col}>{item.productName}</Text>
              <Text style={[styles.colSmall, styles.textCenter]}>{item.quantity}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(item.discount)}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: 'flex-end', marginTop: 20 }}>
          <View style={{ width: 250 }}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text>{formatCurrency(sale.subtotal)}</Text>
            </View>
            {sale.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount ({sale.discountPercent}%)</Text>
                <Text style={styles.income}>-{formatCurrency(sale.discountAmount)}</Text>
              </View>
            )}
            {sale.taxAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax ({sale.taxPercent}%)</Text>
                <Text>+{formatCurrency(sale.taxAmount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(sale.total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
              <Text style={styles.income}>{formatCurrency(sale.amountPaid)}</Text>
            </View>
            {sale.amountDue > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.bold]}>Amount Due</Text>
                <Text style={[styles.expense, styles.bold]}>{formatCurrency(sale.amountDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={{ marginTop: 30, paddingTop: 15, borderTop: '1 solid #e2e8f0' }}>
          <View style={{ flexDirection: 'row', gap: 30 }}>
            <View>
              <Text style={{ color: '#64748b', fontSize: 9 }}>Payment Method</Text>
              <Text style={{ fontWeight: 'bold' }}>{sale.paymentMethod}</Text>
            </View>
            <View>
              <Text style={{ color: '#64748b', fontSize: 9 }}>Payment Status</Text>
              <Text style={[
                styles.bold,
                sale.paymentStatus === 'PAID' ? styles.statusPaid :
                sale.paymentStatus === 'PARTIAL' ? styles.statusPartial : styles.statusUnpaid
              ]}>
                {sale.paymentStatus}
              </Text>
            </View>
          </View>
          {sale.notes && (
            <View style={{ marginTop: 15 }}>
              <Text style={{ color: '#64748b', fontSize: 9 }}>Notes</Text>
              <Text>{sale.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! • Generated by SheetCon • {formatDate(generatedAt)}
        </Text>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════
// INVENTORY REPORT PDF
// ═══════════════════════════════════════════════════

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
}

interface InventoryReportProps {
  businessName: string;
  products: Product[];
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  generatedAt: string;
}

const InventoryReportDocument = ({ 
  businessName, 
  products, 
  totalValue, 
  lowStockCount, 
  outOfStockCount,
  generatedAt 
}: InventoryReportProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{businessName}</Text>
          <Text style={styles.subtitle}>Inventory Report • {formatDate(generatedAt)}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Products</Text>
            <Text style={styles.summaryValue}>{products.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Stock Value</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatCurrency(totalValue)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Low Stock Items</Text>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{lowStockCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Out of Stock Items</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{outOfStockCount}</Text>
          </View>
        </View>

        {/* Alerts */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              ⚠️ {lowStockCount} items are low on stock and {outOfStockCount} items are out of stock. 
              Please review and reorder as needed.
            </Text>
          </View>
        )}

        {/* Products Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Inventory ({products.length} products)</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.col, styles.bold]}>Product</Text>
            <Text style={[styles.colMedium, styles.bold]}>SKU</Text>
            <Text style={[styles.colMedium, styles.bold]}>Category</Text>
            <Text style={[styles.colSmall, styles.textCenter, styles.bold]}>Stock</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Cost</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Value</Text>
          </View>
          {products.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.col}>{p.name}</Text>
              <Text style={styles.colMedium}>{p.sku || '-'}</Text>
              <Text style={styles.colMedium}>{p.category || '-'}</Text>
              <Text style={[
                styles.colSmall, 
                styles.textCenter,
                p.stock <= 0 ? styles.expense : p.stock <= p.minStock ? { color: '#f59e0b' } : {}
              ]}>
                {p.stock} {p.unit}
              </Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(p.costPrice)}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(p.stock * p.costPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by SheetCon • {formatDate(generatedAt)} • All data synced from Google Sheets
        </Text>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════
// SALES REPORT PDF
// ═══════════════════════════════════════════════════

interface SalesReportProps {
  businessName: string;
  period: string;
  sales: Sale[];
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  generatedAt: string;
}

const SalesReportDocument = ({
  businessName,
  period,
  sales,
  totalRevenue,
  totalPaid,
  totalDue,
  generatedAt,
}: SalesReportProps) => {
  // Group by payment method
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {};
  sales.forEach(s => {
    if (!byPaymentMethod[s.paymentMethod]) {
      byPaymentMethod[s.paymentMethod] = { count: 0, amount: 0 };
    }
    byPaymentMethod[s.paymentMethod].count++;
    byPaymentMethod[s.paymentMethod].amount += s.total;
  });

  // Group by status
  const byStatus: Record<string, { count: number; amount: number }> = {};
  sales.forEach(s => {
    if (!byStatus[s.paymentStatus]) {
      byStatus[s.paymentStatus] = { count: 0, amount: 0 };
    }
    byStatus[s.paymentStatus].count++;
    byStatus[s.paymentStatus].amount += s.total;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{businessName}</Text>
          <Text style={styles.subtitle}>Sales Report • {period}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sales</Text>
            <Text style={styles.summaryValue}>{sales.length} invoices</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Collected</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pending Dues</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{formatCurrency(totalDue)}</Text>
          </View>
        </View>

        {/* By Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales by Payment Method</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.col, styles.bold]}>Payment Method</Text>
            <Text style={[styles.colMedium, styles.textCenter, styles.bold]}>Count</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Amount</Text>
          </View>
          {Object.entries(byPaymentMethod).map(([method, data]) => (
            <View key={method} style={styles.row}>
              <Text style={styles.col}>{method}</Text>
              <Text style={[styles.colMedium, styles.textCenter]}>{data.count}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(data.amount)}</Text>
            </View>
          ))}
        </View>

        {/* By Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales by Payment Status</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.col, styles.bold]}>Status</Text>
            <Text style={[styles.colMedium, styles.textCenter, styles.bold]}>Count</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Amount</Text>
          </View>
          {Object.entries(byStatus).map(([status, data]) => (
            <View key={status} style={styles.row}>
              <Text style={[
                styles.col,
                status === 'PAID' ? styles.statusPaid :
                status === 'PARTIAL' ? styles.statusPartial : styles.statusUnpaid
              ]}>
                {status}
              </Text>
              <Text style={[styles.colMedium, styles.textCenter]}>{data.count}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(data.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Recent Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales List ({sales.length} invoices)</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.colMedium, styles.bold]}>Invoice</Text>
            <Text style={[styles.colSmall, styles.bold]}>Date</Text>
            <Text style={[styles.col, styles.bold]}>Customer</Text>
            <Text style={[styles.colMedium, styles.textRight, styles.bold]}>Total</Text>
            <Text style={[styles.colMedium, styles.textCenter, styles.bold]}>Status</Text>
          </View>
          {sales.slice(0, 30).map((sale) => (
            <View key={sale.id} style={styles.row}>
              <Text style={styles.colMedium}>{sale.invoiceNumber}</Text>
              <Text style={styles.colSmall}>{formatDate(sale.date)}</Text>
              <Text style={styles.col}>{sale.customerName}</Text>
              <Text style={[styles.colMedium, styles.textRight]}>{formatCurrency(sale.total)}</Text>
              <Text style={[
                styles.colMedium, 
                styles.textCenter,
                sale.paymentStatus === 'PAID' ? styles.statusPaid :
                sale.paymentStatus === 'PARTIAL' ? styles.statusPartial : styles.statusUnpaid
              ]}>
                {sale.paymentStatus}
              </Text>
            </View>
          ))}
          {sales.length > 30 && (
            <Text style={{ marginTop: 10, color: '#64748b', fontStyle: 'italic' }}>
              ... and {sales.length - 30} more invoices
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by SheetCon • {formatDate(generatedAt)} • All data synced from Google Sheets
        </Text>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════

export async function generateFinanceStatementPDF(
  title: string,
  period: string,
  transactions: FinanceTransaction[]
): Promise<Blob> {
  const doc = (
    <FinanceStatementDocument
      title={title}
      period={period}
      transactions={transactions}
      generatedAt={new Date().toISOString()}
    />
  );
  return await pdf(doc).toBlob();
}

export async function generateInvoicePDF(
  sale: Sale,
  businessName: string
): Promise<Blob> {
  const doc = (
    <InvoiceDocument
      sale={sale}
      businessName={businessName}
      generatedAt={new Date().toISOString()}
    />
  );
  return await pdf(doc).toBlob();
}

export async function generateInventoryReportPDF(
  businessName: string,
  products: Product[]
): Promise<Blob> {
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  const doc = (
    <InventoryReportDocument
      businessName={businessName}
      products={products}
      totalValue={totalValue}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
      generatedAt={new Date().toISOString()}
    />
  );
  return await pdf(doc).toBlob();
}

export async function generateSalesReportPDF(
  businessName: string,
  period: string,
  sales: Sale[]
): Promise<Blob> {
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalDue = sales.reduce((sum, s) => sum + s.amountDue, 0);

  const doc = (
    <SalesReportDocument
      businessName={businessName}
      period={period}
      sales={sales}
      totalRevenue={totalRevenue}
      totalPaid={totalPaid}
      totalDue={totalDue}
      generatedAt={new Date().toISOString()}
    />
  );
  return await pdf(doc).toBlob();
}

// Helper to download PDF
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}