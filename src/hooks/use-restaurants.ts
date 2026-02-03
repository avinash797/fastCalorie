import { useQuery } from "@tanstack/react-query";
import { Restaurant } from "@/types/consumer";

export function useRestaurants() {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: async (): Promise<Restaurant[]> => {
      const res = await fetch("/api/v1/restaurants");
      if (!res.ok) {
        throw new Error("Failed to fetch restaurants");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
