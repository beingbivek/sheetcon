// app/api/internal/reconcile/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOAuth2Client } from '@/lib/google-sheet';
import { google } from 'googleapis';
import {
  RANGES as SHEET_RANGES,
  HEADERS as SHEET_HEADERS,
  sheetRowsToObjectsPublic,
} from '@/lib/google-sheet-business';
import { invalidateSpreadsheetCache } from '@/lib/cache';
import {
  enqueueProductSync,
  enqueueSupplierSync,
  enqueueCustomerSync,
  enqueuePurchaseSync,
  enqueueSaleSync,
} from '@/lib/db-sync';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let synced = 0;
  let retried = 0;
  let errors = 0;

  try {
    // ── 1. Retry FAILED rows ────────────────────────────────────────────────

    // Failed products
    const failedProducts = await prisma.businessProduct.findMany({
      where: { syncStatus: 'FAILED' },
      select: { id: true, sheetConnection: { select: { userId: true } }, externalSheetId: true },
      take: 50,
    });
    for (const p of failedProducts) {
      try {
        enqueueProductSync(p.sheetConnection.userId, p.externalSheetId, p.id);
        retried++;
      } catch { errors++; }
    }

    // Failed suppliers
    const failedSuppliers = await prisma.businessSupplier.findMany({
      where: { syncStatus: 'FAILED' },
      select: { id: true, sheetConnection: { select: { userId: true } }, externalSheetId: true },
      take: 50,
    });
    for (const s of failedSuppliers) {
      try {
        enqueueSupplierSync(s.sheetConnection.userId, s.externalSheetId, s.id);
        retried++;
      } catch { errors++; }
    }

    // Failed customers
    const failedCustomers = await prisma.businessCustomer.findMany({
      where: { syncStatus: 'FAILED' },
      select: { id: true, sheetConnection: { select: { userId: true } }, externalSheetId: true },
      take: 50,
    });
    for (const c of failedCustomers) {
      try {
        enqueueCustomerSync(c.sheetConnection.userId, c.externalSheetId, c.id);
        retried++;
      } catch { errors++; }
    }

    // Failed purchases
    const failedPurchases = await prisma.businessPurchase.findMany({
      where: { syncStatus: 'FAILED' },
      select: { id: true, sheetConnection: { select: { userId: true } }, externalSheetId: true },
      take: 50,
    });
    for (const p of failedPurchases) {
      try {
        enqueuePurchaseSync(p.sheetConnection.userId, p.externalSheetId, p.id);
        retried++;
      } catch { errors++; }
    }

    // Failed sales
    const failedSales = await prisma.businessSale.findMany({
      where: { syncStatus: 'FAILED' },
      select: { id: true, sheetConnection: { select: { userId: true } }, externalSheetId: true },
      take: 50,
    });
    for (const s of failedSales) {
      try {
        enqueueSaleSync(s.sheetConnection.userId, s.externalSheetId, s.id);
        retried++;
      } catch { errors++; }
    }

    // ── 2. Reconcile sheet → DB for active connections ──────────────────────

    const connections = await prisma.sheetConnection.findMany({
      where: {
        templateId: 'business-management',
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        spreadsheetId: true,
      },
      take: 20, // Max 20 connections per cron run
    });

    for (const conn of connections) {
      try {
        const auth = await getOAuth2Client(conn.userId);
        const sheets = google.sheets({ version: 'v4', auth });

        // Products
        const pRes = await sheets.spreadsheets.values.get({
          spreadsheetId: conn.spreadsheetId,
          range: SHEET_RANGES.PRODUCTS,
        });
        const sheetProducts = sheetRowsToObjectsPublic(
          pRes.data.values as string[][] | null,
          SHEET_HEADERS.PRODUCTS
        ) as any[];

        for (const sp of sheetProducts) {
          if (!sp.id) continue;
          const db = await prisma.businessProduct.findUnique({
            where: { id: sp.id },
            select: { updatedAt: true },
          });
          const sheetTs = sp.updatedAt ? new Date(sp.updatedAt).getTime() : 0;
          const dbTs = db?.updatedAt?.getTime() ?? 0;
          if (sheetTs > dbTs) {
            await prisma.businessProduct.upsert({
              where: {
                sheetConnectionId_id: {
                  sheetConnectionId: conn.id,
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
                syncStatus: 'SYNCED',
              },
              create: {
                id: sp.id,
                sheetConnectionId: conn.id,
                externalSheetId: conn.spreadsheetId,
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
                createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
                updatedAt: new Date(sp.updatedAt),
                lastSyncedAt: new Date(),
              },
            });
            synced++;
          }
        }

        await invalidateSpreadsheetCache(conn.spreadsheetId);
        await prisma.sheetConnection.update({
          where: { id: conn.id },
          data: { lastSyncedAt: new Date() },
        });
      } catch (err) {
        console.error(`[Reconcile] Error for connection ${conn.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      retried,
      errors,
      connections: connections.length,
      duration: `${Date.now() - startTime}ms`,
    });
  } catch (err) {
    console.error('[Reconcile] Cron failed:', err);
    return NextResponse.json(
      { error: 'Reconciliation failed' },
      { status: 500 }
    );
  }
}