import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { formatARS } from "@/components/shared/currency-input";

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  recommended?: boolean;
}

export interface PlanCardsProps {
  plans: Plan[];
  onSelect?: (planId: string) => void;
  className?: string;
}

export function PlanCards({ plans, onSelect, className }: PlanCardsProps) {
  return (
    <section id="planes" className={cn("py-16 px-4 sm:px-6", className)}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold">Planes de suscripción</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Elegí el plan que mejor se adapte a tu uso
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-6",
                plan.recommended
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border"
              )}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Recomendado
                </span>
              )}

              <h3 className="text-xl font-bold">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">
                  ${formatARS(plan.price)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-active)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={plan.recommended ? "default" : "outline"}
                onClick={() => onSelect?.(plan.id)}
              >
                Elegir plan
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
