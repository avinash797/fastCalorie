import { Metadata } from "next";
import { ConsumerHomePageClient } from "@/components/consumer/home-page-client";

export const metadata: Metadata = {
  title: "FastCalorie — Fast Food Nutrition Search",
  description:
    "Instantly search calorie and nutrition information for thousands of menu items from top fast food chains.",
};

export default function ConsumerHomePage() {
  return <ConsumerHomePageClient />;
}
