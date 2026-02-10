"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiStepForm, type Step } from "@/components/shared/multi-step-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/shared/phone-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { formatARS } from "@/components/shared/currency-input";
import type { Plan } from "@/lib/types";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { useState, useCallback } from "react";

const subscriberSchema = z.object({
  fullName: z.string().min(1, "Nombre es requerido"),
  phone: z.string().regex(/^\+549\d{10}$/, "Teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  plate: z.string().regex(/^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/i, "Patente inválida"),
  vehicleModel: z.string().optional(),
  planId: z.string().min(1, "Seleccioná un plan"),
});

type SubscriberFormData = z.infer<typeof subscriberSchema>;

const steps: Step[] = [
  { id: "personal", title: "Datos personales" },
  { id: "plan", title: "Plan" },
  { id: "confirm", title: "Confirmación" },
];

export interface NewSubscriberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  onSubmit: (data: SubscriberFormData) => Promise<void>;
}

export function NewSubscriberModal({
  open,
  onOpenChange,
  plans,
  onSubmit,
}: NewSubscriberModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<SubscriberFormData>({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      plate: "",
      vehicleModel: "",
      planId: "",
    },
  });

  const values = form.watch();
  const selectedPlan = plans.find((p) => p.id === values.planId);

  const validateStep = useCallback(
    async (step: number): Promise<boolean> => {
      if (step === 0) {
        const result = await form.trigger(["fullName", "phone", "plate"]);
        return result;
      }
      if (step === 1) {
        const result = await form.trigger(["planId"]);
        return result;
      }
      return true;
    },
    [form]
  );

  const handleComplete = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;
    setLoading(true);
    try {
      await onSubmit(form.getValues());
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [form, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo suscriptor</DialogTitle>
        </DialogHeader>

        <MultiStepForm
          steps={steps}
          validateStep={validateStep}
          onComplete={handleComplete}
          persistKey="nereo-new-subscriber"
          completeLabel="Crear suscriptor"
          loading={loading}
        >
          {({ currentStep }) => (
            <div className="min-h-[240px]">
              {/* Step 0: Personal data */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre completo *</Label>
                    <Input
                      id="fullName"
                      {...form.register("fullName")}
                      placeholder="Juan Pérez"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <PhoneInput
                      value={values.phone}
                      onChange={(v) => form.setValue("phone", v, { shouldValidate: true })}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate">Patente *</Label>
                    <Input
                      id="plate"
                      {...form.register("plate")}
                      placeholder="AB123CD"
                      className="uppercase"
                    />
                    {form.formState.errors.plate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.plate.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="juan@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Modelo</Label>
                      <Input
                        id="vehicleModel"
                        {...form.register("vehicleModel")}
                        placeholder="Toyota Corolla"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Plan selection */}
              {currentStep === 1 && (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() =>
                        form.setValue("planId", plan.id, { shouldValidate: true })
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
                        values.planId === plan.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.features.slice(0, 2).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          ${formatARS(plan.price)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{plan.interval === "monthly" ? "mes" : plan.interval}
                        </span>
                        {values.planId === plan.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                  {form.formState.errors.planId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.planId.message}
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Confirmation */}
              {currentStep === 2 && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-semibold">Resumen</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Nombre</dt>
                      <dd className="font-medium">{values.fullName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Teléfono</dt>
                      <dd className="font-medium">{values.phone}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Patente</dt>
                      <dd className="font-medium uppercase">{values.plate}</dd>
                    </div>
                    {selectedPlan && (
                      <>
                        <div className="border-t pt-2 flex justify-between">
                          <dt className="text-muted-foreground">Plan</dt>
                          <dd className="font-medium">{selectedPlan.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Precio</dt>
                          <dd className="font-bold text-primary">
                            ${formatARS(selectedPlan.price)}/{selectedPlan.interval === "monthly" ? "mes" : selectedPlan.interval}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </MultiStepForm>
      </DialogContent>
    </Dialog>
  );
}
