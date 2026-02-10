import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LandingHeroProps {
  tenantName: string;
  tagline?: string;
  backgroundImage?: string;
  checkoutHref?: string;
  className?: string;
}

export function LandingHero({
  tenantName,
  tagline = "Lavá tu auto con un plan mensual. Sin filas, sin sorpresas.",
  backgroundImage,
  checkoutHref = "#planes",
  className,
}: LandingHeroProps) {
  return (
    <section
      className={cn(
        "relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-muted",
        className
      )}
    >
      {/* Background image — optimized with next/image */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "relative z-10 mx-auto max-w-3xl px-4 py-20 text-center",
          backgroundImage ? "text-white" : "text-foreground"
        )}
      >
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {tenantName}
        </h1>
        <p
          className={cn(
            "mt-4 text-lg sm:text-xl",
            backgroundImage ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {tagline}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="text-base px-8">
            <a href={checkoutHref}>Suscribite</a>
          </Button>
          <Button
            asChild
            variant={backgroundImage ? "secondary" : "outline"}
            size="lg"
            className="text-base px-8"
          >
            <a href="#servicios">Ver servicios</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
