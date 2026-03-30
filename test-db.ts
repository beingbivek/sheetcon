// test-db.ts

import { prisma } from './lib/db';

async function main() {
  console.log('🔍 Testing database connection...');
  
  try {
    // This will fail because we don't have any tiers yet, but proves connection works
    const tierCount = await prisma.tier.count();
    console.log('✅ Database connected!');
    console.log(`📊 Number of tiers: ${tierCount}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();