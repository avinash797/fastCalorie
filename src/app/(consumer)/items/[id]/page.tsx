import { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems, restaurants } from "@/lib/db/schema";
import { ItemDetailClient } from "@/components/consumer/item-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [item] = await db
    .select({
      name: menuItems.name,
      restaurantName: restaurants.name,
    })
    .from(menuItems)
    .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
    .where(eq(menuItems.id, id))
    .limit(1);

  if (!item) {
    return {
      title: "Item Not Found | FastCalorie",
    };
  }

  return {
    title: `${item.name} Calories & Macros — ${item.restaurantName} | FastCalorie`,
    description: `Nutrition facts for ${item.name} from ${item.restaurantName}. Amount of calories, protein, carbs, and fat.`,
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemDetailClient id={id} />;
}
