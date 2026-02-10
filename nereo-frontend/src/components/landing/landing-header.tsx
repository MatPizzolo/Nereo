"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#precios", label: "Precios" },
  { href: "mailto:hola@nereo.ar", label: "Contacto" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-4 transition-all duration-300 sm:px-6",
        scrolled
          ? "bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent"
      )}
    >
      {/* Logo */}
      <Link href="/landing" className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors",
            scrolled
              ? "bg-primary text-primary-foreground"
              : "bg-white/20 text-white backdrop-blur"
          )}
        >
          N
        </div>
        <span
          className={cn(
            "text-lg font-bold transition-colors",
            scrolled ? "text-foreground" : "text-white"
          )}
        >
          Nereo
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors",
              scrolled
                ? "text-muted-foreground hover:text-foreground"
                : "text-white/70 hover:text-white"
            )}
          >
            {link.label}
          </a>
        ))}
        <Button size="sm" asChild>
          <Link href="/registro">Empezá gratis</Link>
        </Button>
      </nav>

      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              !scrolled && "text-white hover:bg-white/10"
            )}
          >
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
              <Link href="/registro" onClick={() => setOpen(false)}>
                Empezá gratis
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
