"use client";

import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion";

interface FrameSequenceProps {
  frameCount: number;
  framePath: (index: number) => string;
  className?: string;
  scrollTarget?: RefObject<HTMLElement | null>;
}

export function FrameSequence({
  frameCount,
  framePath,
  className,
  scrollTarget,
}: FrameSequenceProps) {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currentFrameRef = useRef(0);

  const targetRef = scrollTarget ?? fallbackRef;

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const frameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, frameCount - 1]
  );

  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const clampedIndex = Math.min(
        Math.max(Math.round(index), 0),
        frameCount - 1
      );

      if (clampedIndex === currentFrameRef.current && loaded) return;
      currentFrameRef.current = clampedIndex;

      const img = imagesRef.current[clampedIndex];
      if (!img || !img.complete) return;

      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cover fit
      const scale = Math.max(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight
      );
      const x = (canvas.width - img.naturalWidth * scale) / 2;
      const y = (canvas.height - img.naturalHeight * scale) / 2;
      ctx.drawImage(
        img,
        x,
        y,
        img.naturalWidth * scale,
        img.naturalHeight * scale
      );
    },
    [frameCount, loaded]
  );

  useMotionValueEvent(frameIndex, "change", (latest) => {
    requestAnimationFrame(() => drawFrame(latest));
  });

  // Preload all images
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          setLoaded(true);
        }
        // Draw first frame as soon as it loads
        if (i === 0) {
          requestAnimationFrame(() => drawFrame(0));
        }
      };
      images.push(img);
    }

    imagesRef.current = images;
  }, [frameCount, framePath, drawFrame]);

  // Draw first frame once loaded
  useEffect(() => {
    if (loaded) {
      drawFrame(0);
    }
  }, [loaded, drawFrame]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => drawFrame(currentFrameRef.current);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawFrame]);

  return (
    <div ref={fallbackRef} className={className}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/60">Cargando...</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
