import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <Link
              href="/"
              className="flex items-center justify-center md:justify-start gap-2 transition-opacity hover:opacity-90"
            >
              <span className="text-lg font-bold tracking-tight text-foreground">
                Fast<span className="text-primary">Calorie</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Making fast food nutrition transparent and accessible for
              everyone.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 md:items-end">
            <p className="text-sm text-muted-foreground text-center md:text-right">
              Data sourced from official restaurant nutrition guides.
              <br />
              Not affiliated with any restaurant chain.
            </p>
            <div
              className="text-xs text-muted-foreground/50"
              suppressHydrationWarning
            >
              &copy; {new Date().getFullYear()} FastCalorie
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
