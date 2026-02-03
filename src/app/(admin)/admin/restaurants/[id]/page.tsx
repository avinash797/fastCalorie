"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  FileUp,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  status: "active" | "draft" | "archived";
  itemCount: number;
  lastIngestionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  proteinG: string | null;
  totalCarbsG: string | null;
  totalFatG: string | null;
  isAvailable: boolean;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Form state
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<Restaurant["status"]>("draft");

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch restaurant");
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Populate form when data loads
  React.useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setSlug(restaurant.slug);
      setWebsiteUrl(restaurant.websiteUrl || "");
      setDescription(restaurant.description || "");
      setStatus(restaurant.status);
    }
  }, [restaurant]);

  const { data: items, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["items", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/items?restaurantId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || data;
    },
    enabled: !!token && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          slug,
          websiteUrl: websiteUrl || null,
          description: description || null,
          status,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update restaurant");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });

  const hasChanges = React.useMemo(() => {
    if (!restaurant) return false;
    return (
      name !== restaurant.name ||
      slug !== restaurant.slug ||
      (websiteUrl || "") !== (restaurant.websiteUrl || "") ||
      (description || "") !== (restaurant.description || "") ||
      status !== restaurant.status
    );
  }, [restaurant, name, slug, websiteUrl, description, status]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Restaurant not found</p>
        <Button
          variant="link"
          onClick={() => router.push("/admin/restaurants")}
        >
          Back to restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/restaurants")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {restaurant.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              /{restaurant.slug} · {restaurant.itemCount} items
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/ingestion?restaurantId=${id}`}>
            <Button variant="outline">
              <FileUp className="mr-2 size-4" />
              Upload PDF
            </Button>
          </Link>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {updateMutation.error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          {updateMutation.error.message}
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-100 p-3 rounded-lg">
          Restaurant updated successfully
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Basic information about the restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as Restaurant["status"])}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                {items?.length || 0} items from nutrition data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingItems ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Calories</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        Protein
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.slice(0, 10).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                          {!item.isAvailable && (
                            <Badge variant="secondary" className="ml-2">
                              Unavailable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.category}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.calories}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {item.proteinG ? `${item.proteinG}g` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No menu items yet</p>
                  <p className="text-sm">Upload a nutrition PDF to add items</p>
                </div>
              )}
              {items && items.length > 10 && (
                <div className="p-4 border-t text-center">
                  <Link href={`/admin/items?restaurantId=${id}`}>
                    <Button variant="link">
                      View all {items.length} items
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
            </CardHeader>
            <CardContent>
              {restaurant.logoUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" className="w-full mt-4">
                Upload Logo
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="secondary"
                  className={
                    status === "active"
                      ? "bg-green-100 text-green-800"
                      : status === "archived"
                        ? "bg-red-100 text-red-800"
                        : ""
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{restaurant.itemCount}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Ingestion</span>
                <span>
                  {restaurant.lastIngestionAt
                    ? formatDistanceToNow(
                        new Date(restaurant.lastIngestionAt),
                        {
                          addSuffix: true,
                        },
                      )
                    : "Never"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {formatDistanceToNow(new Date(restaurant.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {restaurant.websiteUrl && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Website</span>
                    <a
                      href={restaurant.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Visit
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
