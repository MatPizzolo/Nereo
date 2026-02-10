"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type FieldValues,
  type Path,
  type UseFormReturn,
  Controller,
} from "react-hook-form";

export interface FormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: (field: {
    value: T[Path<T>];
    onChange: (value: T[Path<T>]) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLElement>;
  }) => React.ReactNode;
}

export function FormField<T extends FieldValues>({
  form,
  name,
  label,
  helperText,
  required = false,
  className,
  children,
}: FormFieldProps<T>) {
  const error = form.formState.errors[name];

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={name} className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          {children({
            value: field.value,
            onChange: field.onChange,
            onBlur: field.onBlur,
            name: field.name,
            ref: field.ref,
          })}
          {error && (
            <p className="text-sm text-destructive">
              {error.message as string}
            </p>
          )}
          {!error && helperText && (
            <p className="text-sm text-muted-foreground">{helperText}</p>
          )}
        </div>
      )}
    />
  );
}
