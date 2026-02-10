"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

export interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  async function startScanning() {
    if (!containerRef.current) return;
    setCameraError(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      );
      setScanning(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo acceder a la cámara";
      setCameraError(msg);
      onError?.(msg);
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id="qr-reader"
        ref={containerRef}
        className="mx-auto max-w-[300px] overflow-hidden rounded-xl border-2"
      />

      {cameraError && (
        <p className="text-center text-sm text-destructive">{cameraError}</p>
      )}

      <Button
        onClick={scanning ? stopScanning : startScanning}
        variant={scanning ? "outline" : "default"}
        className="w-full min-h-[48px] text-base"
      >
        {scanning ? (
          <>
            <CameraOff className="mr-2 h-5 w-5" />
            Detener cámara
          </>
        ) : (
          <>
            <Camera className="mr-2 h-5 w-5" />
            Escanear QR
          </>
        )}
      </Button>
    </div>
  );
}
