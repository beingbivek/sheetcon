// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ═══════════════════════════════════════════════════
  // 1. CREATE DEFAULT TIERS
  // ═══════════════════════════════════════════════════

  console.log("📊 Creating tiers...");

  const freeTier = await prisma.tier.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      name: "Free",
      slug: "free",
      description: "Perfect for getting started",
      price: 0,
      currency: "INR",
      maxUsers: -1, // unlimited
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
    where: { slug: "pro" },
    update: {},
    create: {
      name: "Pro",
      slug: "pro",
      description: "For growing businesses",
      price: 299,
      currency: "INR",
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
    where: { slug: "business" },
    update: {},
    create: {
      name: "Business",
      slug: "business",
      description: "For enterprises and teams",
      price: 999,
      currency: "INR",
      maxUsers: -1,
      currentUserCount: 0,
      maxSheets: 10,
      maxTemplates: -1, // unlimited
      maxCrudPerDay: -1, // unlimited
      customBranding: true,
      prioritySupport: true,
      exportToPdf: true,
      isActive: true,
      displayOrder: 3,
    },
  });

  console.log("✅ Created 3 tiers:");
  console.log(`   - ${freeTier.name} (${freeTier.slug})`);
  console.log(`   - ${proTier.name} (${proTier.slug})`);
  console.log(`   - ${businessTier.name} (${businessTier.slug})\n`);

  // ═══════════════════════════════════════════════════
  // 2. CREATE DEFAULT ADMIN USER
  // ═══════════════════════════════════════════════════

  console.log("👤 Creating admin user...");

  const adminEmail = "admin@sheetcon.local";
  const adminPassword = "admin123"; // Change this in production!
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Created admin user:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role: ${admin.role}\n`);

  // Add this at the end of the main() function, before the summary section

  // ═══════════════════════════════════════════════════
  // 3. CREATE TEST USERS (For development)
  // ═══════════════════════════════════════════════════

  console.log("👥 Creating test users...");

  const testUser1 = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      name: "John Doe",
      tierId: freeTier.id,
      isActive: true,
      emailVerified: true,
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
      tierId: proTier.id,
      isActive: true,
      emailVerified: true,
    },
  });

  const testUser3 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Wilson",
      tierId: businessTier.id,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log("✅ Created test users:");
  console.log(`   - ${testUser1.name} (${testUser1.email}) - Free`);
  console.log(`   - ${testUser2.name} (${testUser2.email}) - Pro`);
  console.log(`   - ${testUser3.name} (${testUser3.email}) - Business\n`);

  // ═══════════════════════════════════════════════════
  // 4. CREATE DEFAULT TEMPLATES
  // ═══════════════════════════════════════════════════

  console.log("📋 Creating templates...");

  const financeTemplate = await prisma.template.upsert({
    where: { slug: "finance" },
    update: {},
    create: {
      slug: "finance",
      name: "Personal Finance Tracker",
      description:
        "Track income, expenses, and budgets with beautiful charts and reports. Perfect for personal financial management.",
      icon: "💰",
      primaryColor: "#10b981",
      version: "1.0.0",
      isActive: true,
      isPublic: true,
      features: [
        "dashboard",
        "transactions",
        "reports",
        "pdf_export",
        "charts",
      ],
      configSchema: {
        requiredSheets: [
          {
            name: "Transactions",
            displayName: "Transactions",
            columns: [
              { key: "date", label: "Date", type: "date", required: true },
              {
                key: "description",
                label: "Description",
                type: "string",
                required: true,
              },
              {
                key: "category",
                label: "Category",
                type: "enum",
                options: [
                  "Salary",
                  "Freelance",
                  "Food",
                  "Transport",
                  "Bills",
                  "Entertainment",
                  "Shopping",
                  "Healthcare",
                  "Other",
                ],
                required: true,
              },
              {
                key: "type",
                label: "Type",
                type: "enum",
                options: ["income", "expense"],
                required: true,
              },
              {
                key: "amount",
                label: "Amount",
                type: "number",
                required: true,
                min: 0,
              },
            ],
          },
        ],
        ui: {
          layout: "sidebar",
          pages: ["dashboard", "transactions", "reports"],
        },
        features: {
          dashboard: {
            enabled: true,
            widgets: [
              "income_expense_summary",
              "category_breakdown",
              "recent_transactions",
            ],
          },
          reports: {
            enabled: true,
            types: ["monthly_statement"],
          },
          export: {
            pdf: true,
            csv: true,
          },
        },
      },
    },
  });

  const inventoryTemplate = await prisma.template.upsert({
    where: { slug: "inventory" },
    update: {},
    create: {
      slug: "inventory",
      name: "Small Business Inventory & Billing",
      description:
        "Manage products, create invoices, and track sales. Perfect for small shops and businesses.",
      icon: "📦",
      primaryColor: "#3b82f6",
      version: "1.0.0",
      isActive: true,
      isPublic: true,
      features: [
        "dashboard",
        "products",
        "invoices",
        "customers",
        "reports",
        "pdf_export",
      ],
      configSchema: {
        requiredSheets: [
          {
            name: "Products",
            displayName: "Products Inventory",
            columns: [
              {
                key: "product_id",
                label: "Product ID",
                type: "auto-increment",
                required: true,
              },
              {
                key: "name",
                label: "Product Name",
                type: "string",
                required: true,
              },
              {
                key: "category",
                label: "Category",
                type: "string",
                required: false,
              },
              {
                key: "price",
                label: "Price",
                type: "number",
                required: true,
                min: 0,
              },
              {
                key: "stock",
                label: "Stock",
                type: "integer",
                required: true,
                default: 0,
                min: 0,
              },
              {
                key: "min_stock",
                label: "Min Stock Alert",
                type: "integer",
                default: 5,
                min: 0,
              },
            ],
          },
          {
            name: "Invoices",
            displayName: "Sales Invoices",
            columns: [
              {
                key: "invoice_no",
                label: "Invoice #",
                type: "auto-increment",
                prefix: "INV-",
              },
              { key: "date", label: "Date", type: "date", required: true },
              {
                key: "customer_name",
                label: "Customer",
                type: "string",
                required: true,
              },
              { key: "items", label: "Items", type: "json", required: true },
              {
                key: "subtotal",
                label: "Subtotal",
                type: "number",
                computed: true,
              },
              { key: "tax", label: "Tax %", type: "number", default: 18 },
              { key: "total", label: "Total", type: "number", computed: true },
              {
                key: "status",
                label: "Status",
                type: "enum",
                options: ["Unpaid", "Partial", "Paid"],
                default: "Unpaid",
              },
            ],
          },
        ],
        ui: {
          layout: "sidebar",
          pages: ["dashboard", "products", "invoices", "customers", "reports"],
        },
        features: {
          dashboard: {
            enabled: true,
            widgets: [
              "revenue_chart",
              "low_stock_alerts",
              "recent_invoices",
              "top_products",
            ],
          },
          invoices: {
            builder: true,
            preview: true,
            pdf_export: true,
            print: true,
          },
          reports: {
            enabled: true,
            types: ["sales_report", "inventory_report", "tax_summary"],
          },
        },
      },
    },
  });

  console.log("✅ Created templates:");
  console.log(`   - ${financeTemplate.name} (${financeTemplate.slug})`);
  console.log(`   - ${inventoryTemplate.name} (${inventoryTemplate.slug})\n`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════

  const tierCount = await prisma.tier.count();
  const adminCount = await prisma.admin.count();
  const userCount = await prisma.user.count();
  const templateCount = await prisma.template.count();

  console.log("📊 Database seeding complete!");
  console.log("═══════════════════════════════════════");
  console.log(`Tiers:     ${tierCount}`);
  console.log(`Admins:    ${adminCount}`);
  console.log(`Users:     ${userCount}`);
  console.log(`Templates: ${templateCount}`);
  console.log("═══════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
