import { Metadata } from "next";
import { RestaurantListClient } from "@/components/consumer/restaurant-list-client";

export const metadata: Metadata = {
  title: "Browse Restaurants | FastCalorie",
  description:
    "View nutritional guides for popular fast food chains including McDonald's, Taco Bell, Chipotle, and more.",
};

export default function RestaurantsPage() {
  return <RestaurantListClient />;
}
