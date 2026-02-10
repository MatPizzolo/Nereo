import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Droplets className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-6 text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        La página que buscás no existe
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
