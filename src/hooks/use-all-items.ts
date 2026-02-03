import { useQuery } from "@tanstack/react-query";
import { ConsumerItem } from "@/types/consumer";

export function useAllItems() {
  return useQuery({
    queryKey: ["all-items"],
    queryFn: async (): Promise<ConsumerItem[]> => {
      const res = await fetch("/api/v1/all-items");
      if (!res.ok) {
        throw new Error("Failed to fetch items");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
