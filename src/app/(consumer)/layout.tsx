import { Header } from "@/components/consumer/header";
import { Footer } from "@/components/consumer/footer";

export default function ConsumerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="theme-consumer flex min-h-screen flex-col bg-background font-sans antialiased text-foreground selection:bg-primary/20 selection:text-primary">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
