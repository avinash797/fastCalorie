import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants, menuItems } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    const MAX_SEARCH_LENGTH = 500;
    if (query.trim().length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search query too long (max ${MAX_SEARCH_LENGTH} characters)` },
        { status: 400 },
      );
    }

    const searchTerm = `%${query.trim()}%`;

    // Search against item name, restaurant name, and category
    // Only return items that are available from active restaurants
    const results = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        restaurantName: restaurants.name,
        restaurantSlug: restaurants.slug,
        category: menuItems.category,
        calories: menuItems.calories,
        proteinG: menuItems.proteinG,
        totalCarbsG: menuItems.totalCarbsG,
        totalFatG: menuItems.totalFatG,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .where(
        and(
          eq(menuItems.isAvailable, true),
          eq(restaurants.status, "active"),
          or(
            ilike(menuItems.name, searchTerm),
            ilike(restaurants.name, searchTerm),
            ilike(menuItems.category, searchTerm),
          ),
        ),
      )
      .limit(50);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
