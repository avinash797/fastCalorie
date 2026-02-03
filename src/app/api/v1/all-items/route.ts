import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants, menuItems } from "@/lib/db/schema";

export async function GET() {
  try {
    // Get all available items from active restaurants
    const results = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        restaurantSlug: restaurants.slug,
        category: menuItems.category,
        calories: menuItems.calories,
        proteinG: menuItems.proteinG,
        totalCarbsG: menuItems.totalCarbsG,
        totalFatG: menuItems.totalFatG,
        servingSize: menuItems.servingSize,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .where(
        and(eq(menuItems.isAvailable, true), eq(restaurants.status, "active")),
      );

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error fetching all items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
