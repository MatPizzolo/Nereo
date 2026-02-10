"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";
import { useCallback } from "react";

/**
 * Normalizes an Argentine phone number to E.164 format (+549XXXXXXXXXX).
 * Strips the leading "15", prepends "+549" if only local digits are provided.
 * Matches backend normalization in `pkg/phone/normalize.go`.
 */
export function normalizePhoneAR(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // Already full E.164 with country code
  if (digits.startsWith("549") && digits.length === 13) {
    return `+${digits}`;
  }

  // Has +54 but missing the 9 for mobile
  if (digits.startsWith("54") && !digits.startsWith("549") && digits.length === 12) {
    return `+549${digits.slice(2)}`;
  }

  // Starts with 0 (e.g. 011...) — strip the 0
  if (digits.startsWith("0")) {
    const withoutZero = digits.slice(1);
    return `+549${withoutZero}`;
  }

  // Starts with 15 (local mobile prefix) — strip the 15, assume AMBA (11)
  if (digits.startsWith("15") && digits.length === 10) {
    return `+5491${digits}`;
  }

  // 10-digit local number (e.g. 1155667788)
  if (digits.length === 10) {
    return `+549${digits}`;
  }

  // Return as-is with + prefix if we can't normalize
  return raw.startsWith("+") ? raw : `+${digits}`;
}

/** Validates that a string is a valid Argentine mobile E.164 number */
export function isValidPhoneAR(phone: string): boolean {
  return /^\+549\d{10}$/.test(phone);
}

/** Formats a normalized E.164 number for display: +54 9 11 5566-7788 */
export function formatPhoneDisplay(e164: string): string {
  const match = e164.match(/^\+549(\d{2})(\d{4})(\d{4})$/);
  if (!match) return e164;
  return `+54 9 ${match[1]} ${match[2]}-${match[3]}`;
}

export interface PhoneInputProps {
  value: string;
  onChange: (normalized: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = "11 5566-7788",
  disabled = false,
  className,
  name,
}: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow the user to type freely, normalize on blur
      onChange(raw);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (value && value.trim()) {
      const normalized = normalizePhoneAR(value);
      onChange(normalized);
    }
    onBlur?.();
  }, [value, onChange, onBlur]);

  return (
    <div className={cn("relative", className)}>
      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="tel"
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9"
        inputMode="tel"
        autoComplete="tel"
      />
    </div>
  );
}
