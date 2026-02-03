import { NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId query parameter is required" },
        { status: 400 }
      );
    }

    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const offset = (page - 1) * limit;

    const conditions = [eq(menuItems.restaurantId, restaurantId)];
    if (category) {
      conditions.push(eq(menuItems.category, category));
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(menuItems)
        .where(whereClause)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(menuItems)
        .where(whereClause),
    ]);

    return NextResponse.json(
      {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
