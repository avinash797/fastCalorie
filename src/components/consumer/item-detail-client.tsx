"use client";

import Link from "next/link";
import { ChevronLeft, FileText, Calendar } from "lucide-react";
import { useItemDetail } from "@/hooks/use-item-detail";
import { NutritionLabel } from "@/components/consumer/nutrition-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemDetailClientProps {
  id: string;
}

export function ItemDetailClient({ id }: ItemDetailClientProps) {
  const { data: item, isLoading } = useItemDetail(id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
        {/* Back button skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Col skeleton */}
          <div className="lg:col-span-7">
            <div className="flex items-start justify-between gap-4 mb-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20 w-20 rounded-lg" />
            </div>

            <div className="flex items-center gap-3 mb-8">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>

            {/* Macro visualizer skeleton */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-4 w-full rounded-full mb-4" />
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-7 w-12 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Source info skeleton */}
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>

          {/* Right Col skeleton (nutrition label) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Skeleton className="h-[500px] w-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-12 text-center text-destructive">Item not found</div>
    );
  }

  // Calculate macro percentages for visualizer
  const proteinCals = parseFloat(item.proteinG || "0") * 4;
  const carbCals = parseFloat(item.totalCarbsG || "0") * 4;
  const fatCals = parseFloat(item.totalFatG || "0") * 9;
  const totalMacroCals = proteinCals + carbCals + fatCals || 1; // avoid divide by zero

  const proteinPct = Math.round((proteinCals / totalMacroCals) * 100);
  const carbPct = Math.round((carbCals / totalMacroCals) * 100);
  const fatPct = Math.round((fatCals / totalMacroCals) * 100);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
      {/* Breadcrumb / Back */}
      <div className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="pl-0 hover:bg-transparent hover:text-primary text-muted-foreground"
        >
          <Link href={`/restaurants/${item.restaurantSlug}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {item.restaurantName}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Col: Header & Macros */}
        <div className="lg:col-span-7">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-foreground leading-tight">
              {item.name}
            </h1>
            <div className="flex-shrink-0 text-center bg-secondary/30 rounded-lg p-3 border border-border min-w-[80px]">
              <span className="block text-2xl font-black text-foreground leading-none">
                {item.calories}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Calories
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <Badge
              variant="secondary"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {item.category}
            </Badge>
            {item.servingSize && (
              <span className="text-sm text-muted-foreground">
                Serving Size: {item.servingSize}
              </span>
            )}
          </div>

          {/* Macro Visualizer */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Macro Breakdown
            </h3>

            {/* Bars */}
            <div className="flex h-4 w-full rounded-full overflow-hidden mb-4 bg-muted">
              <div
                style={{ width: `${proteinPct}%` }}
                className="bg-blue-500"
                title={`Protein: ${proteinPct}%`}
              />
              <div
                style={{ width: `${carbPct}%` }}
                className="bg-green-500"
                title={`Carbs: ${carbPct}%`}
              />
              <div
                style={{ width: `${fatPct}%` }}
                className="bg-orange-500"
                title={`Fat: ${fatPct}%`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Protein
                  </span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {item.proteinG || 0}g
                </div>
                <div className="text-xs text-muted-foreground">
                  {proteinPct}% of cals
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Carbs
                  </span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {item.totalCarbsG || 0}g
                </div>
                <div className="text-xs text-muted-foreground">
                  {carbPct}% of cals
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Fat
                  </span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {item.totalFatG || 0}g
                </div>
                <div className="text-xs text-muted-foreground">
                  {fatPct}% of cals
                </div>
              </div>
            </div>
          </div>

          {/* Source Info */}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Last updated: {new Date(item.updatedAt).toLocaleDateString()}
              </span>
            </div>
            {item.sourcePdfUrl && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <a
                  href={item.sourcePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  View Source PDF
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Nutrition Label */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <NutritionLabel item={item} />
        </div>
      </div>
    </div>
  );
}
