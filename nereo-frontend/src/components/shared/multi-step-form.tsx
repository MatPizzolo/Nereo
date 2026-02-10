"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface Step {
  id: string;
  title: string;
  description?: string;
}

export interface MultiStepFormProps {
  steps: Step[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void | Promise<void>;
  /** Validate current step before advancing. Return true to allow. */
  validateStep?: (step: number) => boolean | Promise<boolean>;
  /** Persist step index to sessionStorage under this key */
  persistKey?: string;
  completeLabel?: string;
  loading?: boolean;
  children: (props: { currentStep: number }) => React.ReactNode;
  className?: string;
}

export function MultiStepForm({
  steps,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  validateStep,
  persistKey,
  completeLabel = "Confirmar",
  loading = false,
  children,
  className,
}: MultiStepFormProps) {
  const [internalStep, setInternalStep] = useState(() => {
    if (controlledStep !== undefined) return controlledStep;
    if (persistKey && typeof window !== "undefined") {
      const saved = sessionStorage.getItem(persistKey);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const currentStep = controlledStep ?? internalStep;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const setStep = useCallback(
    (step: number) => {
      if (controlledStep === undefined) {
        setInternalStep(step);
      }
      onStepChange?.(step);
      if (persistKey && typeof window !== "undefined") {
        sessionStorage.setItem(persistKey, step.toString());
      }
    },
    [controlledStep, onStepChange, persistKey]
  );

  // Sync controlled step
  useEffect(() => {
    if (controlledStep !== undefined) {
      setInternalStep(controlledStep);
    }
  }, [controlledStep]);

  const handleNext = useCallback(async () => {
    if (validateStep) {
      const valid = await validateStep(currentStep);
      if (!valid) return;
    }

    if (isLastStep) {
      await onComplete?.();
      if (persistKey && typeof window !== "undefined") {
        sessionStorage.removeItem(persistKey);
      }
    } else {
      setStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, onComplete, validateStep, setStep, persistKey]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, setStep]);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Stepper */}
      <nav aria-label="Progreso" className="flex items-center justify-center">
        <ol className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <li key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:inline",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-8 sm:w-12",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div>{children({ currentStep })}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirstStep || loading}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={handleNext} disabled={loading}>
          {loading
            ? "Procesando..."
            : isLastStep
              ? completeLabel
              : "Siguiente"}
          {!isLastStep && !loading && (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
