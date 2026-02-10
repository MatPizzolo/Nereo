"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { QRScanner } from "@/components/operario/qr-scanner";
import { PlateSearch } from "@/components/operario/plate-search";
import { CheckInResult, type CheckInResultType } from "@/components/operario/check-in-result";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Booking } from "@/lib/booking-types";
import { Camera, Search } from "lucide-react";

interface MembershipCheckResponse {
  status: "active" | "expired" | "not_found";
  customerName?: string;
  plate?: string;
  plan?: string;
  subscriberId?: string;
}

export default function CheckInPage() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<{
    type: CheckInResultType;
    data?: MembershipCheckResponse;
  } | null>(null);
  const [tab, setTab] = useState<string>("plate");

  // Check membership by QR data
  const checkMembership = useMutation({
    mutationFn: (qrData: string) =>
      api.post<MembershipCheckResponse>("/api/v1/check-in/verify", {
        qr_data: qrData,
        tenant_id: user?.tenantId,
        branch_id: selectedBranchId,
      }),
    onSuccess: (data) => {
      if (data.status === "active") {
        setResult({ type: "active", data });
      } else if (data.status === "expired") {
        setResult({ type: "expired", data });
      } else {
        setResult({ type: "invalid" });
      }
    },
    onError: () => {
      setResult({ type: "invalid" });
    },
  });

  // Register wash (optimistic add to kanban)
  const registerWash = useMutation({
    mutationFn: (subscriberId: string) =>
      api.post<Booking>("/api/v1/bookings", {
        subscriber_id: subscriberId,
        tenant_id: user?.tenantId,
        branch_id: selectedBranchId,
      }),
    onMutate: async () => {
      // Optimistic: we'll invalidate after success
      const queryKey = ["bookings", user?.tenantId, selectedBranchId];
      await queryClient.cancelQueries({ queryKey });
      return { queryKey };
    },
    onSuccess: (_data, _vars, context) => {
      toast.success("Lavado registrado");
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      setResult(null);
      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }
    },
    onError: () => {
      toast.error("No se pudo registrar el lavado");
    },
  });

  const handleQRScan = useCallback(
    (data: string) => {
      checkMembership.mutate(data);
    },
    [checkMembership]
  );

  const handlePlateSelect = useCallback(
    (booking: Booking) => {
      setResult({
        type: "active",
        data: {
          status: "active",
          customerName: booking.customerName,
          plate: booking.plate,
          subscriberId: booking.subscriberId,
        },
      });
    },
    []
  );

  const handleRegisterWash = useCallback(() => {
    if (result?.data?.subscriberId) {
      registerWash.mutate(result.data.subscriberId);
    }
  }, [result, registerWash]);

  const handleReset = useCallback(() => {
    setResult(null);
  }, []);

  // Show result screen
  if (result) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-4">
        <CheckInResult
          type={result.type}
          customerName={result.data?.customerName}
          plate={result.data?.plate}
          plan={result.data?.plan}
          onRegisterWash={handleRegisterWash}
          onChargeSingle={() => toast.info("Cobro único — próximamente")}
          onRenew={() => toast.info("Renovación — próximamente")}
          onRetry={() => {
            handleReset();
            setTab("plate");
          }}
        />
        <button
          onClick={handleReset}
          className="w-full py-2 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al check-in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-4">
      <h1 className="text-xl font-bold">Check-in</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="plate" className="flex-1 min-h-[44px] text-base">
            <Search className="mr-1.5 h-4 w-4" />
            Patente
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex-1 min-h-[44px] text-base">
            <Camera className="mr-1.5 h-4 w-4" />
            QR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plate" className="mt-4">
          <PlateSearch onSelect={handlePlateSelect} />
        </TabsContent>

        <TabsContent value="qr" className="mt-4">
          <QRScanner onScan={handleQRScan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
