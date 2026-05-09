// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ═══════════════════════════════════════════════════
  // 1. TIERS
  // ═══════════════════════════════════════════════════

  console.log('📊 Creating tiers...');

  const freeTier = await prisma.tier.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Free',
      slug: 'free',
      description: 'Perfect for getting started',
      price: 0,
      currency: 'NPR',
      maxUsers: -1,
      currentUserCount: 0,
      maxSheets: 1,
      maxTemplates: 1,
      maxCrudPerDay: 500,
      customBranding: false,
      prioritySupport: false,
      exportToPdf: true,
      isActive: true,
      displayOrder: 1,
    },
  });

  const proTier = await prisma.tier.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Pro',
      slug: 'pro',
      description: 'For growing businesses',
      price: 299,
      annualPrice: 2868,
      currency: 'NPR',
      maxUsers: -1,
      currentUserCount: 0,
      maxSheets: 3,
      maxTemplates: 2,
      maxCrudPerDay: 5000,
      customBranding: true,
      prioritySupport: true,
      exportToPdf: true,
      isActive: true,
      displayOrder: 2,
    },
  });

  const businessTier = await prisma.tier.upsert({
    where: { slug: 'business' },
    update: {},
    create: {
      name: 'Business',
      slug: 'business',
      description: 'For enterprises and teams',
      price: 999,
      annualPrice: 9588,
      currency: 'NPR',
      maxUsers: -1,
      currentUserCount: 0,
      maxSheets: 10,
      maxTemplates: -1,
      maxCrudPerDay: -1,
      customBranding: true,
      prioritySupport: true,
      exportToPdf: true,
      isActive: true,
      displayOrder: 3,
    },
  });

  console.log('✅ Created tiers:');
  console.log(`   - ${freeTier.name}`);
  console.log(`   - ${proTier.name}`);
  console.log(`   - ${businessTier.name}\n`);

  // ═══════════════════════════════════════════════════
  // 2. ADMIN
  // ═══════════════════════════════════════════════════

  console.log('👤 Creating admin...');

  const SEED_PASSWORD = 'ChangeMe@2025!';
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@sheetcon.local' },
    update: {},
    create: {
      email: 'admin@sheetcon.local',
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Created admin:');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${SEED_PASSWORD}  ← change this immediately after login`);
  console.log(`   Role:     ${admin.role}\n`);

  // ═══════════════════════════════════════════════════
  // 3. TEMPLATES
  // ═══════════════════════════════════════════════════

  console.log('📋 Creating templates...');

  const financeTemplate = await prisma.template.upsert({
    where: { slug: 'finance' },
    update: {},
    create: {
      slug: 'finance',
      name: 'Personal Finance Tracker',
      description: 'Track income, expenses, and budgets with beautiful charts and reports.',
      icon: '💰',
      primaryColor: '#10b981',
      version: '1.0.0',
      isActive: true,
      isPublic: true,
      features: ['dashboard', 'transactions', 'reports', 'pdf_export', 'charts'],
      configSchema: {
        requiredSheets: [
          {
            name: 'Transactions',
            columns: [
              { key: 'date',        label: 'Date',        type: 'date',     required: true },
              { key: 'description', label: 'Description', type: 'string',   required: true },
              {
                key: 'category',
                label: 'Category',
                type: 'enum',
                options: [
                  'Salary', 'Freelance', 'Food', 'Transport',
                  'Bills', 'Entertainment', 'Shopping',
                  'Healthcare', 'Other',
                ],
                required: true,
              },
              {
                key: 'type',
                label: 'Type',
                type: 'enum',
                options: ['income', 'expense'],
                required: true,
              },
              { key: 'amount', label: 'Amount', type: 'number', min: 0, required: true },
            ],
          },
        ],
      },
    },
  });

  const inventoryTemplate = await prisma.template.upsert({
    where: { slug: 'inventory' },
    update: {},
    create: {
      slug: 'inventory',
      name: 'Small Business Inventory & Billing',
      description: 'Manage products, create invoices, and track sales.',
      icon: '📦',
      primaryColor: '#3b82f6',
      version: '1.0.0',
      isActive: true,
      isPublic: true,
      features: ['dashboard', 'products', 'invoices', 'customers', 'reports', 'pdf_export'],
      configSchema: {
        requiredSheets: ['Products', 'Customers', 'Sales', 'SaleItems'],
      },
    },
  });

  const businessTemplate = await prisma.template.upsert({
    where: { slug: 'business-management' },
    update: {},
    create: {
      slug: 'business-management',
      name: 'Business Management Suite',
      description: 'Full business management system with suppliers, inventory, customers, sales, purchases, and analytics.',
      icon: '🏢',
      primaryColor: '#6366f1',
      version: '1.0.0',
      isActive: true,
      isPublic: true,
      features: [
        'suppliers',
        'products',
        'customers',
        'purchases',
        'sales',
        'pos',
        'reports',
        'landed_cost',
        'bill_print',
        'payment_qr',
        'low_stock_alerts',
      ],
      configSchema: {
        requiredSheets: [
          {
            name: '_Config',
            columns: [
              { key: 'key',   label: 'Key',   type: 'string' },
              { key: 'value', label: 'Value', type: 'string' },
            ],
          },
          {
            name: 'Suppliers',
            columns: [
              { key: 'id',            label: 'ID',             type: 'string' },
              { key: 'name',          label: 'Name',           type: 'string', required: true },
              { key: 'phone',         label: 'Phone',          type: 'string' },
              { key: 'email',         label: 'Email',          type: 'string' },
              { key: 'address',       label: 'Address',        type: 'string' },
              { key: 'city',          label: 'City',           type: 'string' },
              { key: 'contactPerson', label: 'Contact Person', type: 'string' },
              { key: 'paymentTerms',  label: 'Payment Terms',  type: 'string' },
              { key: 'notes',         label: 'Notes',          type: 'string' },
              { key: 'createdAt',     label: 'Created At',     type: 'date' },
            ],
          },
          {
            name: 'Products',
            columns: [
              { key: 'id',           label: 'ID',            type: 'string' },
              { key: 'name',         label: 'Name',          type: 'string', required: true },
              { key: 'sku',          label: 'SKU',           type: 'string' },
              { key: 'category',     label: 'Category',      type: 'string' },
              { key: 'description',  label: 'Description',   type: 'string' },
              { key: 'costPrice',    label: 'Cost Price',    type: 'number', required: true },
              { key: 'sellingPrice', label: 'Selling Price', type: 'number', required: true },
              { key: 'stock',        label: 'Stock',         type: 'number' },
              { key: 'minStock',     label: 'Min Stock',     type: 'number' },
              { key: 'unit',         label: 'Unit',          type: 'string' },
              { key: 'supplierId',   label: 'Supplier ID',   type: 'string' },
              { key: 'supplierName', label: 'Supplier Name', type: 'string' },
              { key: 'imageUrl',     label: 'Image URL',     type: 'string' },
              { key: 'createdAt',    label: 'Created At',    type: 'date' },
              { key: 'updatedAt',    label: 'Updated At',    type: 'date' },
            ],
          },
          {
            name: 'Customers',
            columns: [
              { key: 'id',           label: 'ID',            type: 'string' },
              { key: 'name',         label: 'Name',          type: 'string', required: true },
              { key: 'phone',        label: 'Phone',         type: 'string' },
              { key: 'email',        label: 'Email',         type: 'string' },
              { key: 'address',      label: 'Address',       type: 'string' },
              { key: 'city',         label: 'City',          type: 'string' },
              { key: 'customerType', label: 'Customer Type', type: 'enum', options: ['WALK_IN', 'ONLINE'] },
              { key: 'notes',        label: 'Notes',         type: 'string' },
              { key: 'createdAt',    label: 'Created At',    type: 'date' },
            ],
          },
          {
            name: 'Purchases',
            columns: [
              { key: 'id',             label: 'ID',              type: 'string' },
              { key: 'invoiceNumber',  label: 'Invoice Number',  type: 'string' },
              { key: 'date',           label: 'Date',            type: 'date' },
              { key: 'supplierId',     label: 'Supplier ID',     type: 'string' },
              { key: 'supplierName',   label: 'Supplier Name',   type: 'string' },
              { key: 'subtotal',       label: 'Subtotal',        type: 'number' },
              { key: 'taxPercent',     label: 'Tax %',           type: 'number' },
              { key: 'taxAmount',      label: 'Tax Amount',      type: 'number' },
              { key: 'transportCost',  label: 'Transport Cost',  type: 'number' },
              { key: 'customsCost',    label: 'Customs Cost',    type: 'number' },
              { key: 'storageCost',    label: 'Storage Cost',    type: 'number' },
              { key: 'otherExpenses',  label: 'Other Expenses',  type: 'number' },
              { key: 'landedCost',     label: 'Landed Cost',     type: 'number' },
              { key: 'total',          label: 'Total',           type: 'number' },
              { key: 'amountPaid',     label: 'Amount Paid',     type: 'number' },
              { key: 'amountDue',      label: 'Amount Due',      type: 'number' },
              { key: 'status',         label: 'Status',          type: 'enum', options: ['PAID', 'PARTIAL', 'UNPAID'] },
              { key: 'imageUrl',       label: 'Image URL',       type: 'string' },
              { key: 'notes',          label: 'Notes',           type: 'string' },
              { key: 'createdAt',      label: 'Created At',      type: 'date' },
            ],
          },
          {
            name: 'PurchaseItems',
            columns: [
              { key: 'id',          label: 'ID',           type: 'string' },
              { key: 'purchaseId',  label: 'Purchase ID',  type: 'string' },
              { key: 'productId',   label: 'Product ID',   type: 'string' },
              { key: 'productName', label: 'Product Name', type: 'string' },
              { key: 'quantity',    label: 'Quantity',     type: 'number' },
              { key: 'unitPrice',   label: 'Unit Price',   type: 'number' },
              { key: 'total',       label: 'Total',        type: 'number' },
            ],
          },
          {
            name: 'Sales',
            columns: [
              { key: 'id',             label: 'ID',              type: 'string' },
              { key: 'invoiceNumber',  label: 'Invoice Number',  type: 'string' },
              { key: 'date',           label: 'Date',            type: 'date' },
              { key: 'customerId',     label: 'Customer ID',     type: 'string' },
              { key: 'customerName',   label: 'Customer Name',   type: 'string' },
              { key: 'subtotal',       label: 'Subtotal',        type: 'number' },
              { key: 'discountType',   label: 'Discount Type',   type: 'enum', options: ['PERCENT', 'FIXED'] },
              { key: 'discountValue',  label: 'Discount Value',  type: 'number' },
              { key: 'discountAmount', label: 'Discount Amount', type: 'number' },
              { key: 'taxPercent',     label: 'Tax %',           type: 'number' },
              { key: 'taxAmount',      label: 'Tax Amount',      type: 'number' },
              { key: 'total',          label: 'Total',           type: 'number' },
              { key: 'amountPaid',     label: 'Amount Paid',     type: 'number' },
              { key: 'amountDue',      label: 'Amount Due',      type: 'number' },
              { key: 'paymentMethod',  label: 'Payment Method',  type: 'string' },
              { key: 'status',         label: 'Status',          type: 'enum', options: ['PAID', 'PARTIAL', 'UNPAID'] },
              { key: 'notes',          label: 'Notes',           type: 'string' },
              { key: 'createdAt',      label: 'Created At',      type: 'date' },
            ],
          },
          {
            name: 'SaleItems',
            columns: [
              { key: 'id',          label: 'ID',           type: 'string' },
              { key: 'saleId',      label: 'Sale ID',      type: 'string' },
              { key: 'productId',   label: 'Product ID',   type: 'string' },
              { key: 'productName', label: 'Product Name', type: 'string' },
              { key: 'variation',   label: 'Variation',    type: 'string' },
              { key: 'quantity',    label: 'Quantity',     type: 'number' },
              { key: 'unitPrice',   label: 'Unit Price',   type: 'number' },
              { key: 'total',       label: 'Total',        type: 'number' },
            ],
          },
        ],
      },
    },
  });

  console.log('✅ Created templates:');
  console.log(`   - ${financeTemplate.name}`);
  console.log(`   - ${inventoryTemplate.name}`);
  console.log(`   - ${businessTemplate.name}\n`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════

  const [tierCount, adminCount, templateCount] = await Promise.all([
    prisma.tier.count(),
    prisma.admin.count(),
    prisma.template.count(),
  ]);

  console.log('📊 Seed complete!');
  console.log('═══════════════════════════════════════');
  console.log(`Tiers:     ${tierCount}`);
  console.log(`Admins:    ${adminCount}`);
  console.log(`Templates: ${templateCount}`);
  console.log('═══════════════════════════════════════');
  console.log('\n⚠️  Remember: change the admin password after first login.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());