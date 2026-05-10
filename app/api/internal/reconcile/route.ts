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

/**
 * Reconciliation Cron (Vercel: every 10 minutes)
 * 
 * Syncs changes made directly in Google Sheets back to PostgreSQL.
 * Triggered by: `vercel.json` or scheduled in dashboard
 * 
 * Only processes sheets updated in last 10 min to avoid excessive syncing.
 */

export async function GET(request: NextRequest) {
  // Verify cron secret (prevent unauthorized calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    // Find all active business-management sheets
    const connections = await prisma.sheetConnection.findMany({
      where: {
        templateId: 'business-management',
        isActive: true,
        lastSyncedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 min
        },
      },
      select: {
        id: true,
        userId: true,
        spreadsheetId: true,
        user: { select: { id: true } },
      },
    });

    for (const conn of connections) {
      try {
        const auth = await getOAuth2Client(conn.userId);
        const sheets = google.sheets({ version: 'v4', auth });

        // Reconcile Products
        const pRes = await sheets.spreadsheets.values.get({
          spreadsheetId: conn.spreadsheetId,
          range: SHEET_RANGES.PRODUCTS,
        });
        const sheetProducts = sheetRowsToObjectsPublic(
          pRes.data.values as string[][] | null,
          SHEET_HEADERS.PRODUCTS
        ) as any[];

        for (const sp of sheetProducts) {
          const dbProduct = await prisma.businessProduct.findUnique({
            where: { id: sp.id },
          });

          const sheetUpdated = new Date(sp.updatedAt).getTime();
          const dbUpdated = dbProduct?.updatedAt?.getTime() ?? 0;

          // Sheet is newer — upsert into DB
          if (sheetUpdated > dbUpdated) {
            await prisma.businessProduct.upsert({
              where: { sheetConnectionId_id: { sheetConnectionId: conn.id, id: sp.id } },
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
                createdAt: new Date(sp.createdAt),
                updatedAt: new Date(sp.updatedAt),
                lastSyncedAt: new Date(),
              },
            });
            processedCount++;
          }
        }

        // Reconcile Suppliers
        const sRes = await sheets.spreadsheets.values.get({
          spreadsheetId: conn.spreadsheetId,
          range: SHEET_RANGES.SUPPLIERS,
        });
        const sheetSuppliers = sheetRowsToObjectsPublic(
          sRes.data.values as string[][] | null,
          SHEET_HEADERS.SUPPLIERS
        ) as any[];

        for (const ss of sheetSuppliers) {
          const dbSupplier = await prisma.businessSupplier.findUnique({
            where: { id: ss.id },
          });

          const sheetUpdated = new Date(ss.createdAt).getTime();
          const dbUpdated = dbSupplier?.updatedAt?.getTime() ?? 0;

          if (sheetUpdated > dbUpdated) {
            await prisma.businessSupplier.upsert({
              where: { sheetConnectionId_id: { sheetConnectionId: conn.id, id: ss.id } },
              update: {
                name: ss.name,
                phone: ss.phone,
                email: ss.email,
                address: ss.address,
                city: ss.city,
                contactPerson: ss.contactPerson,
                paymentTerms: ss.paymentTerms,
                notes: ss.notes,
                lastSyncedAt: new Date(),
              },
              create: {
                id: ss.id,
                sheetConnectionId: conn.id,
                externalSheetId: conn.spreadsheetId,
                name: ss.name,
                phone: ss.phone,
                email: ss.email,
                address: ss.address,
                city: ss.city,
                contactPerson: ss.contactPerson,
                paymentTerms: ss.paymentTerms,
                notes: ss.notes,
                createdAt: new Date(ss.createdAt),
                lastSyncedAt: new Date(),
              },
            });
            processedCount++;
          }
        }

        // Reconcile Customers
        const cRes = await sheets.spreadsheets.values.get({
          spreadsheetId: conn.spreadsheetId,
          range: SHEET_RANGES.CUSTOMERS,
        });
        const sheetCustomers = sheetRowsToObjectsPublic(
          cRes.data.values as string[][] | null,
          SHEET_HEADERS.CUSTOMERS
        ) as any[];

        for (const sc of sheetCustomers) {
          const dbCustomer = await prisma.businessCustomer.findUnique({
            where: { id: sc.id },
          });

          const sheetUpdated = new Date(sc.createdAt).getTime();
          const dbUpdated = dbCustomer?.updatedAt?.getTime() ?? 0;

          if (sheetUpdated > dbUpdated) {
            await prisma.businessCustomer.upsert({
              where: { sheetConnectionId_id: { sheetConnectionId: conn.id, id: sc.id } },
              update: {
                name: sc.name,
                phone: sc.phone,
                email: sc.email,
                address: sc.address,
                city: sc.city,
                customerType: sc.customerType,
                notes: sc.notes,
                lastSyncedAt: new Date(),
              },
              create: {
                id: sc.id,
                sheetConnectionId: conn.id,
                externalSheetId: conn.spreadsheetId,
                name: sc.name,
                phone: sc.phone,
                email: sc.email,
                address: sc.address,
                city: sc.city,
                customerType: sc.customerType,
                notes: sc.notes,
                createdAt: new Date(sc.createdAt),
                lastSyncedAt: new Date(),
              },
            });
            processedCount++;
          }
        }

        await invalidateSpreadsheetCache(conn.spreadsheetId);
      } catch (err) {
        console.error(`[Reconcile] Error for connection ${conn.id}:`, err);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      connections: connections.length,
      duration: `${duration}ms`,
    });
  } catch (err) {
    console.error('[Reconcile] Cron failed:', err);
    return NextResponse.json(
      { error: 'Reconciliation failed', details: String(err) },
      { status: 500 }
    );
  }
}