"use client";

import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  variant?: "fab" | "inline" | "cta";
  label?: string;
  className?: string;
}

function buildWhatsAppUrl(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${cleanPhone}`);
  if (message) {
    url.searchParams.set("text", message);
  }
  return url.toString();
}

export function WhatsAppButton({
  phone,
  message,
  variant = "fab",
  label = "WhatsApp",
  className,
}: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(phone, message);

  if (variant === "fab") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95",
          className
        )}
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-[#25D366] hover:underline",
          className
        )}
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    );
  }

  // CTA variant
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#20BD5A] active:bg-[#1DA851]",
        className
      )}
    >
      <MessageCircle className="h-5 w-5" />
      {label}
    </a>
  );
}
