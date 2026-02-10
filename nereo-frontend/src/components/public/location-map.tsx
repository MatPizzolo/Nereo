"use client";

import { cn } from "@/lib/utils";

export interface LocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export function LocationMap({
  lat,
  lng,
  zoom = 15,
  className,
}: LocationMapProps) {
  const src = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}&q=${lat},${lng}&zoom=${zoom}`;

  return (
    <section className={cn("py-16 px-4 sm:px-6", className)}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold">Ubicación</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Encontranos acá
        </p>
        <div className="mt-8 overflow-hidden rounded-xl border">
          <iframe
            src={src}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación del lavadero"
          />
        </div>
      </div>
    </section>
  );
}
