// app/api/user/sheets/connect/route.ts (COMPLETE REPLACEMENT)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createFinanceSpreadsheet,
  getSpreadsheetMetadata,
  initializeExistingSheet,
} from "@/lib/google-sheet";
import { createInventorySpreadsheet } from "@/lib/google-sheet-inventory";
import {
  createBusinessManagementSpreadsheet,
  initializeExistingBusinessSheet,
} from "@/lib/google-sheet-business";
import { importProductsFromSheet } from "@/lib/db-sync";

const VALID_TEMPLATES = [
  "finance",
  "inventory",
  "business-management",
] as const;
type TemplateId = (typeof VALID_TEMPLATES)[number];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).type !== "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { method, sheetId, sheetName, templateId } = body as {
      method: "create" | "existing";
      sheetId?: string;
      sheetName?: string;
      templateId: TemplateId;
    };

    if (!method || !templateId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!(VALID_TEMPLATES as readonly string[]).includes(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        tier: true,
        _count: { select: { sheetConnections: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.accessToken) {
      return NextResponse.json(
        {
          error:
            "Google account not connected. Please sign out and sign in again.",
        },
        { status: 401 },
      );
    }

    if (
      user.tier.maxSheets !== -1 &&
      user._count.sheetConnections >= user.tier.maxSheets
    ) {
      return NextResponse.json(
        {
          error: `Sheet limit reached (${user.tier.maxSheets}). Upgrade your plan.`,
        },
        { status: 403 },
      );
    }

    let finalSpreadsheetId: string;
    let finalSpreadsheetName: string;
    let finalSpreadsheetUrl: string;

    const defaultNames: Record<TemplateId, string> = {
      finance: "Finance Tracker",
      inventory: "Inventory Manager",
      "business-management": "Business Management",
    };

    if (method === "create") {
      const sheetTitle =
        sheetName ||
        `SheetCon - ${defaultNames[templateId]} - ${new Date().toLocaleDateString()}`;

      let result: { spreadsheetId: string; spreadsheetUrl: string };

      if (templateId === "inventory") {
        result = await createInventorySpreadsheet(user.id, sheetTitle);
      } else if (templateId === "business-management") {
        result = await createBusinessManagementSpreadsheet(user.id, sheetTitle);
      } else {
        result = await createFinanceSpreadsheet(user.id, sheetTitle);
      }

      finalSpreadsheetId = result.spreadsheetId;
      finalSpreadsheetName = sheetTitle;
      finalSpreadsheetUrl = result.spreadsheetUrl;
    } else {
      if (!sheetId) {
        return NextResponse.json(
          { error: "Sheet ID is required for existing sheets" },
          { status: 400 },
        );
      }

      const existingConnection = await prisma.sheetConnection.findFirst({
        where: { userId: user.id, spreadsheetId: sheetId },
      });

      if (existingConnection) {
        return NextResponse.json(
          { error: "This sheet is already connected" },
          { status: 409 },
        );
      }

      const metadata = await getSpreadsheetMetadata(user.id, sheetId);

      if (templateId === "finance") {
        await initializeExistingSheet(user.id, sheetId, "Sheet1");
      } else if (templateId === "business-management") {
        await initializeExistingBusinessSheet(user.id, sheetId);
      }

      finalSpreadsheetId = sheetId;
      finalSpreadsheetName = sheetName || metadata.title;
      finalSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    }

    const connection = await prisma.sheetConnection.create({
      data: {
        userId: user.id,
        sheetType: "google_sheets",
        spreadsheetId: finalSpreadsheetId,
        spreadsheetName: finalSpreadsheetName,
        spreadsheetUrl: finalSpreadsheetUrl,
        templateId,
        templateLocked: true,
        lockedAt: new Date(),
        isActive: true,
        syncStatus: "ACTIVE",
        lastSyncedAt: new Date(),
      },
    });

    // Seed DB from sheet (non-blocking — fails silently on empty new sheets)
    if (templateId === 'business-management') {
  const {
    importProductsFromSheet,
    importSuppliersFromSheet,
    importCustomersFromSheet,
    importPurchasesFromSheet,
    importSalesFromSheet,
    importConfigFromSheet,
  } = await import('@/lib/db-sync');
  Promise.all([
    importProductsFromSheet(user.id, connection.id, finalSpreadsheetId),
    importSuppliersFromSheet(user.id, connection.id, finalSpreadsheetId),
    importCustomersFromSheet(user.id, connection.id, finalSpreadsheetId),
    importPurchasesFromSheet(user.id, connection.id, finalSpreadsheetId),
    importSalesFromSheet(user.id, connection.id, finalSpreadsheetId),
    importConfigFromSheet(user.id, connection.id, finalSpreadsheetId),
  ]).catch(err => console.warn('[Sync] Initial import failed:', err));
}

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      spreadsheetId: finalSpreadsheetId,
      spreadsheetUrl: finalSpreadsheetUrl,
      message: "Sheet connected successfully",
    });
  } catch (error: any) {
    console.error("Error connecting sheet:", error);

    if (
      error.message?.includes("invalid_grant") ||
      error.message?.includes("Token")
    ) {
      return NextResponse.json(
        {
          error: "Google session expired. Please sign out and sign in again.",
        },
        { status: 401 },
      );
    }

    if (error.code === 403) {
      return NextResponse.json(
        {
          error:
            "Access denied. Make sure you have permission to access this sheet.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to connect sheet" },
      { status: 500 },
    );
  }
}
