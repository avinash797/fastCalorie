"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, UtensilsCrossed, FileUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "draft" | "archived";
  itemCount: number;
  lastIngestionAt: string | null;
}

interface IngestionJob {
  id: string;
  restaurantId: string;
  status: "pending" | "processing" | "review" | "approved" | "failed";
  itemsExtracted: number;
  itemsApproved: number;
  createdAt: string;
}

interface MenuItem {
  id: string;
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: IngestionJob["status"] }) {
  const variants = {
    pending: {
      label: "Pending",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    },
    processing: {
      label: "Processing",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    },
    review: {
      label: "Review",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
    approved: {
      label: "Approved",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    failed: {
      label: "Failed",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const variant = variants[status] || variants.pending;

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

export default function AdminDashboard() {
  const token = useAuthToken();

  const { data: restaurants, isLoading: loadingRestaurants } = useQuery<
    Restaurant[]
  >({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/restaurants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery<IngestionJob[]>({
    queryKey: ["ingestionJobs", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ingestion/jobs?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // If endpoint doesn't exist yet, return empty
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const isLoading = loadingRestaurants || loadingJobs;

  // Calculate stats
  const activeRestaurants =
    restaurants?.filter((r) => r.status === "active").length || 0;
  const draftRestaurants =
    restaurants?.filter((r) => r.status === "draft").length || 0;
  const archivedRestaurants =
    restaurants?.filter((r) => r.status === "archived").length || 0;
  const totalRestaurants = restaurants?.length || 0;

  const totalItems =
    restaurants?.reduce((sum, r) => sum + (r.itemCount || 0), 0) || 0;

  // Find oldest lastIngestionAt among active restaurants
  const activeWithIngestion = restaurants
    ?.filter((r) => r.status === "active" && r.lastIngestionAt)
    .map((r) => new Date(r.lastIngestionAt!).getTime());
  const oldestIngestion = activeWithIngestion?.length
    ? new Date(Math.min(...activeWithIngestion))
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your FastCalorie nutrition database
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Restaurants
                </CardTitle>
                <Store className="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalRestaurants}</div>
                <p className="text-xs text-muted-foreground">
                  {activeRestaurants} active · {draftRestaurants} draft ·{" "}
                  {archivedRestaurants} archived
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menu Items
                </CardTitle>
                <UtensilsCrossed className="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalItems.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all restaurants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent Ingestions
                </CardTitle>
                <FileUp className="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{jobs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs in the last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Data Freshness
                </CardTitle>
                <Clock className="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {oldestIngestion
                    ? formatDistanceToNow(oldestIngestion, { addSuffix: false })
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Oldest active restaurant data
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent ingestion jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ingestion Jobs</CardTitle>
          <CardDescription>
            Latest PDF ingestion activity across all restaurants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-1">
              {jobs.map((job) => {
                const restaurant = restaurants?.find(
                  (r) => r.id === job.restaurantId,
                );
                return (
                  <Link
                    key={job.id}
                    href={`/admin/ingestion/${job.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {restaurant?.name || "Unknown Restaurant"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(job.createdAt), {
                          addSuffix: true,
                        })}
                        {" · "}
                        {job.itemsApproved}/{job.itemsExtracted} items approved
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileUp className="size-10 mx-auto mb-2 opacity-50" />
              <p>No ingestion jobs yet</p>
              <p className="text-sm">Upload a nutrition PDF to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
