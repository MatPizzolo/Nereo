"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#planes", label: "Planes" },
  { href: "#servicios", label: "Servicios" },
  { href: "#contacto", label: "Contacto" },
];

export interface PublicHeaderProps {
  tenantName?: string;
  tenantLogo?: string;
  checkoutHref?: string;
  className?: string;
}

export function PublicHeader({
  tenantName = "Lavadero",
  tenantLogo,
  checkoutHref = "#planes",
  className,
}: PublicHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6",
        className
      )}
    >
      {/* Logo / Tenant name */}
      <Link href="/" className="flex items-center gap-2">
        {tenantLogo ? (
          <Image
            src={tenantLogo}
            alt={tenantName ?? "Logo"}
            width={32}
            height={32}
            className="rounded-md object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {tenantName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-lg font-bold">{tenantName}</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
        <Button asChild size="sm">
          <a href={checkoutHref}>Suscribite</a>
        </Button>
      </nav>

      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <div className="flex flex-col gap-6 pt-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-lg font-medium text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="mt-4">
              <a href={checkoutHref} onClick={() => setOpen(false)}>
                Suscribite
              </a>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
