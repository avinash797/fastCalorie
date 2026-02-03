import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConsumerItem } from "@/types/consumer";

interface DishCardProps {
  item: ConsumerItem;
}

export function DishCard({ item }: DishCardProps) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="group block focus-visible:outline-none rounded-xl"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 border-transparent shadow-sm hover:shadow-md hover:border-primary/20 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-primary bg-card">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {item.restaurantName}
              </div>
              <CardTitle className="text-base font-bold text-card-foreground leading-tight group-hover:text-primary transition-colors">
                {item.name}
              </CardTitle>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="block text-lg font-bold text-foreground leading-none">
                {item.calories}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/70">
                Cal
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-secondary/50 p-1.5">
              <span className="block font-bold text-foreground">
                {item.proteinG || 0}g
              </span>
              <span className="text-[10px] text-muted-foreground">Prot</span>
            </div>
            <div className="rounded-md bg-secondary/50 p-1.5">
              <span className="block font-bold text-foreground">
                {item.totalCarbsG || 0}g
              </span>
              <span className="text-[10px] text-muted-foreground">Carbs</span>
            </div>
            <div className="rounded-md bg-secondary/50 p-1.5">
              <span className="block font-bold text-foreground">
                {item.totalFatG || 0}g
              </span>
              <span className="text-[10px] text-muted-foreground">Fat</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
