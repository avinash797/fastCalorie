"use client";

import { useRestaurants } from "@/hooks/use-restaurants";
import { RestaurantCard } from "@/components/consumer/restaurant-card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function RestaurantListClient() {
  const { data: restaurants, isLoading, error } = useRestaurants();
  const [query, setQuery] = useState("");

  const filteredRestaurants = restaurants?.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Restaurants
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse all available chains and nutritional guides.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search chains..."
            className="pl-9 bg-secondary/30 border-transparent focus:bg-background focus:ring-primary focus:border-input transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-destructive/10 p-8 text-center text-destructive">
          Failed to load restaurants. Please refresh the page.
        </div>
      ) : filteredRestaurants?.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="text-lg font-medium text-foreground">
            No restaurants found
          </h3>
          <p className="text-muted-foreground">Try checking your spelling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {filteredRestaurants?.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
