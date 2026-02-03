import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants, menuItems } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Get restaurant by slug where status is active
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.slug, slug), eq(restaurants.status, "active")))
      .limit(1);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    // Get distinct categories for this restaurant
    const categoriesResult = await db
      .selectDistinct({ category: menuItems.category })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurant.id),
          eq(menuItems.isAvailable, true),
        ),
      )
      .orderBy(menuItems.category);

    const categories = categoriesResult.map((c) => c.category);

    return NextResponse.json(
      {
        ...restaurant,
        categories,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
