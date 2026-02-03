"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { useAllItems } from "@/hooks/use-all-items";
import { Input } from "@/components/ui/input";
import { DishCard } from "@/components/consumer/dish-card";

export function ConsumerHomePageClient() {
  const { data: items, isLoading, error } = useAllItems();
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => {
    if (!items) return null;
    return new Fuse(items, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "restaurantName", weight: 0.3 },
        { name: "category", weight: 0.2 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [items]);

  const results = useMemo(() => {
    if (!items) return [];
    if (!query) return items.slice(0, 50);
    if (!fuse) return [];

    return fuse
      .search(query)
      .map((result) => result.item)
      .slice(0, 50);
  }, [items, query, fuse]);

  return (
    <div className="pb-20">
      <section className="bg-secondary/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Check the calories. <br className="hidden sm:inline" />
            <span className="text-primary">Before you eat.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
            Instantly search nutrition info for thousands of items from your
            favorite fast food chains.
          </p>

          <div className="relative mx-auto max-w-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search for 'Big Mac', 'Taco', or 'Chicken'..."
              className="h-14 w-full rounded-full border-0 bg-background py-4 pl-12 pr-4 text-lg shadow-lg ring-1 ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {query ? `Results for "${query}"` : "Popular Items"}
          </h2>
          {!isLoading && items && (
            <span className="text-sm text-muted-foreground">
              Showing {results.length} results
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-8 text-center text-destructive">
            Failed to load items. Please try again later.
          </div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No items found
            </h3>
            <p className="text-muted-foreground">
              Try searching for something else like "Burger" or "Fries".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {results.map((item) => (
              <DishCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
