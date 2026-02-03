"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useRestaurantDetail } from "@/hooks/use-restaurant-detail";
import { useRestaurantItems } from "@/hooks/use-restaurant-items";
import { FilterControls } from "@/components/consumer/filter-controls";
import { DishCard } from "@/components/consumer/dish-card";
import { Button } from "@/components/ui/button";

interface RestaurantDetailClientProps {
  slug: string;
}

export function RestaurantDetailClient({ slug }: RestaurantDetailClientProps) {
  // Filter state
  const [category, setCategory] = useState("all");
  const [maxCalories, setMaxCalories] = useState<number | undefined>(undefined);
  const [minProtein, setMinProtein] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState("name_asc");

  const { data: restaurant, isLoading: isLoadingRestaurant } =
    useRestaurantDetail(slug);
  const { data: itemsData, isLoading: isLoadingItems } = useRestaurantItems({
    slug,
    category,
    maxCalories,
    minProtein,
    sort,
  });

  const clearFilters = () => {
    setCategory("all");
    setMaxCalories(undefined);
    setMinProtein(undefined);
    setSort("name_asc");
  };

  if (isLoadingRestaurant) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Loading restaurant...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-12 text-center text-destructive">
        Restaurant not found
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-secondary/30 border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/restaurants"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Restaurants
          </Link>

          <div className="flex items-center gap-6">
            <div className="h-24 w-24 flex-shrink-0 flex items-center justify-center rounded-full bg-card shadow-sm border border-border p-2 overflow-hidden">
              {restaurant.logoUrl ? (
                <Image
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground/30">
                  {restaurant.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground mb-2">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-muted-foreground max-w-2xl">
                  {restaurant.description}
                </p>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                {restaurant.itemCount} menu items
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <FilterControls
          category={category}
          onCategoryChange={setCategory}
          categories={restaurant.categories || []}
          maxCalories={maxCalories}
          onMaxCaloriesChange={setMaxCalories}
          minProtein={minProtein}
          onMinProteinChange={setMinProtein}
          sort={sort}
          onSortChange={setSort}
          onClear={clearFilters}
        />

        {/* Results */}
        {isLoadingItems ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : itemsData?.items.length === 0 ? (
          <div className="py-12 text-center bg-muted/30 rounded-xl border border-dashed border-border">
            <h3 className="text-lg font-medium text-foreground">
              No matching items
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {itemsData?.items.map((item) => (
              <DishCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
