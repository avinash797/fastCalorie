import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface FilterControlsProps {
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  maxCalories: number | undefined;
  onMaxCaloriesChange: (value: number | undefined) => void;
  minProtein: number | undefined;
  onMinProteinChange: (value: number | undefined) => void;
  sort: string;
  onSortChange: (value: string) => void;
  onClear: () => void;
}

export function FilterControls({
  category,
  onCategoryChange,
  categories,
  maxCalories,
  onMaxCaloriesChange,
  minProtein,
  onMinProteinChange,
  sort,
  onSortChange,
  onClear,
}: FilterControlsProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Category Filter */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase">
            Category
          </Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase">
            Sort By
          </Label>
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="calories_asc">
                Calories (Low to High)
              </SelectItem>
              <SelectItem value="calories_desc">
                Calories (High to Low)
              </SelectItem>
              <SelectItem value="protein_desc">
                Protein (High to Low)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Calories */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase">
            Max Calories
          </Label>
          <Input
            type="number"
            placeholder="e.g. 500"
            value={maxCalories || ""}
            onChange={(e) =>
              onMaxCaloriesChange(
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            className="w-full bg-background border-input"
          />
        </div>

        {/* Min Protein */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase">
            Min Protein (g)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 20"
            value={minProtein || ""}
            onChange={(e) =>
              onMinProteinChange(
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            className="w-full bg-background border-input"
          />
        </div>

        {/* Clear Filters */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="shrink-0"
          title="Clear Filters"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}
