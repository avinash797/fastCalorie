"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Home, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotFound() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        </div>

        <h1 className="mb-2 text-4xl font-extrabold text-foreground">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mb-8 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. Try
          searching for a menu item or head back to the home page.
        </p>

        <form onSubmit={handleSearch} className="relative mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search for a menu item..."
            className="h-12 w-full rounded-full border-border bg-background py-3 pl-12 pr-4 text-base ring-1 ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/restaurants">
              <UtensilsCrossed className="h-4 w-4" />
              Browse Restaurants
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
