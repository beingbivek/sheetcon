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

  // bcrypt cost factor 12 — strong but not slow on modern hardware
  // Change this password immediately from the admin dashboard after first login
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
              { key: 'date',        label: 'Date',        type: 'date',                                                                  required: true },
              { key: 'description', label: 'Description', type: 'string',                                                                required: true },
              { key: 'category',    label: 'Category',    type: 'enum', options: ['Salary','Freelance','Food','Transport','Bills','Entertainment','Shopping','Healthcare','Other'], required: true },
              { key: 'type',        label: 'Type',        type: 'enum', options: ['income','expense'],                                   required: true },
              { key: 'amount',      label: 'Amount',      type: 'number', min: 0,                                                        required: true },
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

  console.log('✅ Created templates:');
  console.log(`   - ${financeTemplate.name}`);
  console.log(`   - ${inventoryTemplate.name}\n`);

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