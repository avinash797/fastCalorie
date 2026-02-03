import { useQuery } from "@tanstack/react-query";
import { ConsumerItemDetail } from "@/types/consumer";

export function useItemDetail(id: string) {
  return useQuery({
    queryKey: ["item", id],
    queryFn: async (): Promise<ConsumerItemDetail> => {
      const res = await fetch(`/api/v1/items/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch item");
      }
      return res.json();
    },
    enabled: !!id,
  });
}
