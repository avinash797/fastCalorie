import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";
import { logAudit } from "@/lib/db/audit";
import { updateMenuItemSchema } from "@/lib/validators/menuItem";

export const GET = withAuth(
  async (_request, _admin, context) => {
    try {
      const { id } = await context!.params;

      const [item] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      if (!item) {
        return NextResponse.json(
          { error: "Menu item not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(item, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

export const PUT = withAuth(
  async (request, admin, context) => {
    try {
      const { id } = await context!.params;

      const [existing] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Menu item not found" },
          { status: 404 }
        );
      }

      const body = await request.json();
      const parsed = updateMenuItemSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.issues },
          { status: 400 }
        );
      }

      // Convert numeric fields to strings for decimal columns
      const data = parsed.data;
      const setValues: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        // Decimal columns are stored as strings in Drizzle
        const decimalFields = [
          "totalFatG",
          "saturatedFatG",
          "transFatG",
          "cholesterolMg",
          "sodiumMg",
          "totalCarbsG",
          "dietaryFiberG",
          "sugarsG",
          "proteinG",
        ];
        if (decimalFields.includes(key) && typeof value === "number") {
          setValues[key] = String(value);
        } else {
          setValues[key] = value;
        }
      }

      const [updated] = await db
        .update(menuItems)
        .set(setValues)
        .where(eq(menuItems.id, id))
        .returning();

      await logAudit({
        adminId: admin.id,
        entityType: "menu_item",
        entityId: id,
        action: "update",
        beforeData: existing,
        afterData: updated,
      });

      return NextResponse.json(updated);
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
  async (_request, admin, context) => {
    try {
      const { id } = await context!.params;

      const [existing] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Menu item not found" },
          { status: 404 }
        );
      }

      const [updated] = await db
        .update(menuItems)
        .set({ isAvailable: false })
        .where(eq(menuItems.id, id))
        .returning();

      await logAudit({
        adminId: admin.id,
        entityType: "menu_item",
        entityId: id,
        action: "delete",
        beforeData: existing,
        afterData: updated,
      });

      return NextResponse.json(updated);
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
