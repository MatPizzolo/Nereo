"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod/v4";

const resetSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <InlineAlert variant="error" title="Link inválido">
          El link de restablecimiento es inválido o expiró. Solicitá uno nuevo.
        </InlineAlert>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", {
        token,
        password,
      });
      toast.success("Contraseña actualizada");
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 400
            ? "El link expiró. Solicitá uno nuevo."
            : err.message
        );
      } else {
        setError("Error de conexión. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground text-center">
            Elegí una nueva contraseña para tu cuenta
          </p>
        </div>

        {error && (
          <InlineAlert variant="error" title="Error">
            {error}
          </InlineAlert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repetí la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restablecer contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
