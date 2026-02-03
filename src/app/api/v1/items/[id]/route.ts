import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants, menuItems } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get item with restaurant info, only if item is available and restaurant is active
    const result = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        category: menuItems.category,
        servingSize: menuItems.servingSize,
        calories: menuItems.calories,
        totalFatG: menuItems.totalFatG,
        saturatedFatG: menuItems.saturatedFatG,
        transFatG: menuItems.transFatG,
        cholesterolMg: menuItems.cholesterolMg,
        sodiumMg: menuItems.sodiumMg,
        totalCarbsG: menuItems.totalCarbsG,
        dietaryFiberG: menuItems.dietaryFiberG,
        sugarsG: menuItems.sugarsG,
        proteinG: menuItems.proteinG,
        sourcePdfUrl: menuItems.sourcePdfUrl,
        updatedAt: menuItems.updatedAt,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        restaurantSlug: restaurants.slug,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .where(
        and(
          eq(menuItems.id, id),
          eq(menuItems.isAvailable, true),
          eq(restaurants.status, "active"),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(result[0], {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
