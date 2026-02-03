import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-5xl">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            ⚡
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Fast<span className="text-primary">Calorie</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="text-muted-foreground hover:text-primary hover:bg-secondary rounded-full"
          >
            <Link href="/restaurants">Restaurants</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
