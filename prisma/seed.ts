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
  // 3. SUMMARY
  // ═══════════════════════════════════════════════════

  const tierCount = await prisma.tier.count();
  const adminCount = await prisma.admin.count();
  const userCount = await prisma.user.count();

  console.log("📊 Database seeding complete!");
  console.log("═══════════════════════════════════════");
  console.log(`Tiers:  ${tierCount}`);
  console.log(`Admins: ${adminCount}`);
  console.log(`Users:  ${userCount}`);
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
