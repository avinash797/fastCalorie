import { useQuery } from "@tanstack/react-query";
import { ConsumerItem } from "@/types/consumer";

interface UseRestaurantItemsParams {
  slug: string;
  category?: string;
  minProtein?: number;
  maxCalories?: number;
  sort?: string;
  page?: number;
}

interface RestaurantItemsResponse {
  items: ConsumerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useRestaurantItems({
  slug,
  category,
  minProtein,
  maxCalories,
  sort,
  page = 1,
}: UseRestaurantItemsParams) {
  return useQuery({
    queryKey: [
      "restaurant-items",
      slug,
      category,
      minProtein,
      maxCalories,
      sort,
      page,
    ],
    queryFn: async (): Promise<RestaurantItemsResponse> => {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (minProtein) params.append("minProtein", minProtein.toString());
      if (maxCalories) params.append("maxCalories", maxCalories.toString());
      if (sort) params.append("sort", sort);
      params.append("page", page.toString());

      const res = await fetch(
        `/api/v1/restaurants/${slug}/items?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch items");
      }
      return res.json();
    },
    enabled: !!slug,
  });
}
