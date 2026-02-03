"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Store, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "draft" | "archived";
  itemCount: number;
  lastIngestionAt: string | null;
}

function StatusBadge({ status }: { status: Restaurant["status"] }) {
  const variants = {
    active: {
      label: "Active",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    draft: {
      label: "Draft",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    },
    archived: {
      label: "Archived",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const variant = variants[status];

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function AddRestaurantDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const token = useAuthToken();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          websiteUrl: websiteUrl || undefined,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create restaurant");
      }

      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setName("");
      setSlug("");
      setWebsiteUrl("");
      setDescription("");
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Restaurant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Restaurant</DialogTitle>
          <DialogDescription>
            Create a new restaurant to start uploading nutrition data
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="McDonald's"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mcdonalds"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from name if left empty
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website URL (optional)</Label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.mcdonalds.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the restaurant..."
              rows={3}
            />
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Restaurant"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RestaurantsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const token = useAuthToken();
  const queryClient = useQueryClient();

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
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

  const filteredRestaurants = React.useMemo(() => {
    if (!restaurants) return [];
    if (statusFilter === "all") return restaurants;
    return restaurants.filter((r) => r.status === statusFilter);
  }, [restaurants, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restaurants</h1>
          <p className="text-muted-foreground">
            Manage restaurants and their nutrition data
          </p>
        </div>
        <AddRestaurantDialog
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["restaurants"] })
          }
        />
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">
            All ({restaurants?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active (
            {restaurants?.filter((r) => r.status === "active").length || 0})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft (
            {restaurants?.filter((r) => r.status === "draft").length || 0})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived (
            {restaurants?.filter((r) => r.status === "archived").length || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Store className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No restaurants found</p>
              <p className="text-sm">Create a restaurant to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Last Updated
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((restaurant) => (
                  <TableRow key={restaurant.id} className="group">
                    <TableCell>
                      <Link
                        href={`/admin/restaurants/${restaurant.id}`}
                        className="font-medium hover:underline"
                      >
                        {restaurant.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        /{restaurant.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={restaurant.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {restaurant.itemCount}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {restaurant.lastIngestionAt
                        ? formatDistanceToNow(
                            new Date(restaurant.lastIngestionAt),
                            {
                              addSuffix: true,
                            },
                          )
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/restaurants/${restaurant.id}`}>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
