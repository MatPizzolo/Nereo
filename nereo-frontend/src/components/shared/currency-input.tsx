"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

/** Formats a number as ARS currency string: 15.000,50 */
export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Parses an ARS formatted string back to a number */
export function parseARS(formatted: string): number {
  // Remove dots (thousands separator), replace comma with dot (decimal)
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function CurrencyInput({
  value,
  onChange,
  onBlur,
  placeholder = "0",
  disabled = false,
  className,
  name,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    value ? formatARS(value) : ""
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow digits, dots, and commas while typing
      if (/^[\d.,]*$/.test(raw)) {
        setDisplayValue(raw);
        const parsed = parseARS(raw);
        onChange(parsed);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number on focus for easier editing
    if (value) {
      setDisplayValue(formatARS(value));
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Format on blur
    const parsed = parseARS(displayValue);
    setDisplayValue(parsed ? formatARS(parsed) : "");
    onChange(parsed);
    onBlur?.();
  }, [displayValue, onChange, onBlur]);

  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        $
      </span>
      <Input
        type="text"
        name={name}
        value={isFocused ? displayValue : value ? formatARS(value) : ""}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-7"
        inputMode="decimal"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ARS
      </span>
    </div>
  );
}
