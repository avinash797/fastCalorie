"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  servingSize: string | null;
  calories: number;
  proteinG: string | null;
  totalCarbsG: string | null;
  totalFatG: string | null;
  isAvailable: boolean;
}

export default function MenuItemsPage() {
  return (
    <Suspense fallback={<MenuItemsPageSkeleton />}>
      <MenuItemsPageContent />
    </Suspense>
  );
}

function MenuItemsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Card>
        <CardContent className="p-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function MenuItemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRestaurantId = searchParams.get("restaurantId");

  const [selectedRestaurantId, setSelectedRestaurantId] =
    React.useState<string>(preselectedRestaurantId || "");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = React.useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const token = useAuthToken();
  const queryClient = useQueryClient();

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

  const { data: itemsData, isLoading: loadingItems } = useQuery<
    { items: MenuItem[] } | MenuItem[]
  >({
    queryKey: ["items", selectedRestaurantId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/items?restaurantId=${selectedRestaurantId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!token && !!selectedRestaurantId,
  });

  const items = React.useMemo(() => {
    if (!itemsData) return [];
    return Array.isArray(itemsData) ? itemsData : itemsData.items || [];
  }, [itemsData]);

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats).sort();
  }, [items]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: string;
      value: string | number | boolean;
    }) => {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["items", selectedRestaurantId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/admin/items/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Delete failed");
          return res.json();
        }),
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["items", selectedRestaurantId],
      });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      setSelectedIds(new Set());
    },
  });

  const startEditing = (
    id: string,
    field: string,
    currentValue: string | number | null,
  ) => {
    setEditingCell({ id, field });
    setEditValue(currentValue?.toString() || "");
  };

  const saveEdit = () => {
    if (editingCell) {
      const value = ["calories"].includes(editingCell.field)
        ? parseInt(editValue) || 0
        : editValue;
      updateMutation.mutate({
        id: editingCell.id,
        field: editingCell.field,
        value,
      });
      setEditingCell(null);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const allSelected =
    filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < filteredItems.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu Items</h1>
        <p className="text-muted-foreground">
          Browse and edit menu items across all restaurants
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Restaurant</label>
              <Select
                value={selectedRestaurantId}
                onValueChange={(v) => {
                  setSelectedRestaurantId(v);
                  setCategoryFilter("all");
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {loadingRestaurants ? (
                    <SelectItem value="_loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    restaurants?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                disabled={!selectedRestaurantId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={!selectedRestaurantId}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {!selectedRestaurantId ? (
            <div className="py-12 text-center text-muted-foreground">
              <UtensilsCrossed className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a restaurant</p>
              <p className="text-sm">
                Choose a restaurant above to view its menu items
              </p>
            </div>
          ) : loadingItems ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UtensilsCrossed className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No items found</p>
              <p className="text-sm">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Upload a nutrition PDF to add items"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className={someSelected ? "opacity-50" : ""}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Calories</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Protein
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Carbs
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Fat
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Available
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(selectedIds.has(item.id) && "bg-accent")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => handleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        {editingCell?.id === item.id &&
                        editingCell?.field === "name" ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline truncate block"
                            onClick={() =>
                              startEditing(item.id, "name", item.name)
                            }
                          >
                            {item.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {editingCell?.id === item.id &&
                        editingCell?.field === "category" ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-7 text-sm w-24"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() =>
                              startEditing(item.id, "category", item.category)
                            }
                          >
                            {item.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {editingCell?.id === item.id &&
                        editingCell?.field === "calories" ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-7 text-sm w-20 text-right"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() =>
                              startEditing(item.id, "calories", item.calories)
                            }
                          >
                            {item.calories}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">
                        {item.proteinG ? `${item.proteinG}g` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">
                        {item.totalCarbsG ? `${item.totalCarbsG}g` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">
                        {item.totalFatG ? `${item.totalFatG}g` : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={
                            item.isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {item.isAvailable ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item count */}
      {selectedRestaurantId && filteredItems.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredItems.length} of {items.length} items
        </p>
      )}
    </div>
  );
}
