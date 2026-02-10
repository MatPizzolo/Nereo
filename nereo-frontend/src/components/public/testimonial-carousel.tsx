"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating?: number;
}

export interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  className?: string;
}

export function TestimonialCarousel({
  testimonials,
  className,
}: TestimonialCarouselProps) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  }, [testimonials.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));
  }, [testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  const testimonial = testimonials[current];

  return (
    <section className={cn("py-16 px-4 sm:px-6 bg-muted/30", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold">Lo que dicen nuestros clientes</h2>

        <div className="mt-10 relative">
          <blockquote className="min-h-[120px]">
            {testimonial.rating && (
              <div className="flex items-center justify-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < testimonial.rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
            <p className="text-lg italic text-muted-foreground">
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <footer className="mt-4 text-sm font-semibold">
              — {testimonial.name}
            </footer>
          </blockquote>

          {testimonials.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {current + 1} / {testimonials.length}
              </span>
              <Button variant="outline" size="icon" onClick={next} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
