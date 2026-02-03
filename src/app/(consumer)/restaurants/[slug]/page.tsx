import { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { RestaurantDetailClient } from "@/components/consumer/restaurant-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [restaurant] = await db
    .select({ name: restaurants.name })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant) {
    return {
      title: "Restaurant Not Found | FastCalorie",
    };
  }

  return {
    title: `${restaurant.name} Nutrition Facts & Calories | FastCalorie`,
    description: `Full nutrition guide for ${restaurant.name}. View calories, protein, carbs, and fat for all menu items.`,
  };
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RestaurantDetailClient slug={slug} />;
}
