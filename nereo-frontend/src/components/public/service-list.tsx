import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { formatARS } from "@/components/shared/currency-input";

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface ServiceListProps {
  services: Service[];
  className?: string;
}

export function ServiceList({ services, className }: ServiceListProps) {
  return (
    <section id="servicios" className={cn("py-16 px-4 sm:px-6 bg-muted/30", className)}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold">Nuestros servicios</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Todos los servicios disponibles en el lavadero
        </p>

        <div className="mt-10 space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{service.name}</h3>
                {service.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">
                    {service.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{service.durationMinutes} min</span>
                </div>
              </div>
              <div className="ml-4 text-right shrink-0">
                <span className="text-lg font-bold">
                  ${formatARS(service.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
