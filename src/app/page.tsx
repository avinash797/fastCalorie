import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">FastCalorie</h1>
      <p className="text-muted-foreground">Project scaffold ready.</p>
      <Button>Test Button</Button>
    </main>
  );
}
