import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";
import { logAudit } from "@/lib/db/audit";
import { updateRestaurantSchema } from "@/lib/validators/restaurant";

export const GET = withAuth(
  async (_request, _admin, context) => {
    try {
      const { id } = await context!.params;

      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, id))
        .limit(1);

      if (!restaurant) {
        return NextResponse.json(
          { error: "Restaurant not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(restaurant, {
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
        .from(restaurants)
        .where(eq(restaurants.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Restaurant not found" },
          { status: 404 }
        );
      }

      const body = await request.json();
      const parsed = updateRestaurantSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const data = parsed.data;

      // Check slug uniqueness if slug is being changed
      if (data.slug && data.slug !== existing.slug) {
        const slugConflict = await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.slug, data.slug))
          .limit(1);

        if (slugConflict.length > 0) {
          return NextResponse.json(
            { error: "A restaurant with this slug already exists" },
            { status: 409 }
          );
        }
      }

      const [updated] = await db
        .update(restaurants)
        .set(data)
        .where(eq(restaurants.id, id))
        .returning();

      await logAudit({
        adminId: admin.id,
        entityType: "restaurant",
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
        .from(restaurants)
        .where(eq(restaurants.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Restaurant not found" },
          { status: 404 }
        );
      }

      const [updated] = await db
        .update(restaurants)
        .set({ status: "archived" })
        .where(eq(restaurants.id, id))
        .returning();

      await logAudit({
        adminId: admin.id,
        entityType: "restaurant",
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
