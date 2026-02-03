import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";
import { logAudit } from "@/lib/db/audit";

const bulkActionSchema = z.object({
  itemIds: z.array(z.uuid()).min(1),
  action: z.enum(["delete", "recategorize"]),
  category: z.string().min(1).max(255).optional(),
});

export const POST = withAuth(async (request, admin) => {
  try {
    const body = await request.json();
    const parsed = bulkActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { itemIds, action, category } = parsed.data;

    if (action === "recategorize" && !category) {
      return NextResponse.json(
        { error: "category is required for recategorize action" },
        { status: 400 }
      );
    }

    // Fetch all items to audit-log before data
    const existingItems = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, itemIds));

    if (existingItems.length === 0) {
      return NextResponse.json(
        { error: "No items found with the provided IDs" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      await db
        .update(menuItems)
        .set({ isAvailable: false })
        .where(inArray(menuItems.id, itemIds));

      for (const item of existingItems) {
        await logAudit({
          adminId: admin.id,
          entityType: "menu_item",
          entityId: item.id,
          action: "delete",
          beforeData: item,
          afterData: { ...item, isAvailable: false },
        });
      }
    } else {
      await db
        .update(menuItems)
        .set({ category: category! })
        .where(inArray(menuItems.id, itemIds));

      for (const item of existingItems) {
        await logAudit({
          adminId: admin.id,
          entityType: "menu_item",
          entityId: item.id,
          action: "update",
          beforeData: item,
          afterData: { ...item, category },
        });
      }
    }

    // Fetch updated items
    const updatedItems = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, itemIds));

    return NextResponse.json({
      updated: updatedItems.length,
      items: updatedItems,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
