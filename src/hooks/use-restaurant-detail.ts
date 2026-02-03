import { useQuery } from "@tanstack/react-query";
import { Restaurant } from "@/types/consumer";

interface RestaurantDetail extends Restaurant {
  categories: string[];
}

export function useRestaurantDetail(slug: string) {
  return useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async (): Promise<RestaurantDetail> => {
      const res = await fetch(`/api/v1/restaurants/${slug}`);
      if (!res.ok) {
        throw new Error("Failed to fetch restaurant");
      }
      return res.json();
    },
    enabled: !!slug,
  });
}
