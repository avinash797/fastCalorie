export interface ConsumerItem {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  category: string;
  calories: number;
  proteinG: string | null;
  totalCarbsG: string | null;
  totalFatG: string | null;
  servingSize: string | null;
}

export interface ConsumerItemDetail extends ConsumerItem {
  saturatedFatG: string | null;
  transFatG: string | null;
  cholesterolMg: string | null;
  sodiumMg: string | null;
  dietaryFiberG: string | null;
  sugarsG: string | null;
  sourcePdfUrl: string | null;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  itemCount: number;
  lastIngestionAt: string | null;
}
