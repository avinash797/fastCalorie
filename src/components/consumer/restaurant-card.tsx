import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Restaurant } from "@/types/consumer";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group block focus-visible:outline-none rounded-xl"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 border-transparent shadow-sm hover:shadow-md hover:border-primary/20 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-primary bg-card">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl shadow-sm group-hover:bg-background group-hover:shadow-md transition-all border border-transparent group-hover:border-border overflow-hidden">
            {restaurant.logoUrl ? (
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.name}
                width={56}
                height={56}
                className="object-contain"
              />
            ) : (
              <span className="font-bold text-muted-foreground/50">
                {restaurant.name.charAt(0)}
              </span>
            )}
          </div>
          <h3 className="mb-1 text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {restaurant.itemCount} items
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
