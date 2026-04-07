// app/api/admin/queue-stats/route.ts

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security';
import { getQueueStats } from '@/lib/google-sheets-queue';

export async function GET() {
  try {
    await requireAdmin();
    
    const stats = getQueueStats();
    
    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}