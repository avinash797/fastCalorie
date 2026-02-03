import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, asc, desc, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants, menuItems } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    // Get restaurant first to verify it exists and is active
    const [restaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(and(eq(restaurants.slug, slug), eq(restaurants.status, "active")))
      .limit(1);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    // Parse query parameters
    const category = searchParams.get("category");
    const minProtein = searchParams.get("minProtein");
    const maxCalories = searchParams.get("maxCalories");
    const sort = searchParams.get("sort") || "name_asc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
    );
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions = [
      eq(menuItems.restaurantId, restaurant.id),
      eq(menuItems.isAvailable, true),
    ];

    if (category) {
      conditions.push(eq(menuItems.category, category));
    }

    if (minProtein) {
      const minProteinNum = parseFloat(minProtein);
      if (!isNaN(minProteinNum)) {
        conditions.push(gte(menuItems.proteinG, String(minProteinNum)));
      }
    }

    if (maxCalories) {
      const maxCaloriesNum = parseInt(maxCalories, 10);
      if (!isNaN(maxCaloriesNum)) {
        conditions.push(lte(menuItems.calories, maxCaloriesNum));
      }
    }

    // Determine sort order
    let orderBy;
    switch (sort) {
      case "calories_asc":
        orderBy = asc(menuItems.calories);
        break;
      case "calories_desc":
        orderBy = desc(menuItems.calories);
        break;
      case "protein_desc":
        orderBy = desc(menuItems.proteinG);
        break;
      case "name_asc":
      default:
        orderBy = asc(menuItems.name);
        break;
    }

    const whereClause = and(...conditions);

    // Execute query with pagination
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(menuItems)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(menuItems).where(whereClause),
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
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching restaurant items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
