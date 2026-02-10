"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Droplets, Loader2 } from "lucide-react";
import Link from "next/link";
import { z } from "zod/v4";

const registroSchema = z
  .object({
    businessName: z
      .string()
      .min(2, "El nombre del negocio debe tener al menos 2 caracteres")
      .max(255),
    slug: z
      .string()
      .min(2, "El identificador debe tener al menos 2 caracteres")
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Solo letras minúsculas, números y guiones"
      ),
    ownerName: z
      .string()
      .min(2, "Tu nombre debe tener al menos 2 caracteres")
      .max(255),
    email: z.email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const errorMessages: Record<number, string> = {
  409: "Ese identificador ya está en uso. Probá con otro.",
  422: "Datos inválidos. Revisá el formulario.",
  429: "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
};

export default function RegistroPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function handleBusinessNameChange(value: string) {
    setBusinessName(value);
    // Auto-generate slug from business name
    const generated = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = registroSchema.safeParse({
      businessName,
      slug,
      ownerName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/tenants", {
        name: businessName,
        slug,
        owner_name: ownerName,
        owner_email: email,
        password,
      });
      // Registration successful — redirect to login
      router.push("/login?registered=1");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(errorMessages[err.status] ?? err.message);
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
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Nereo</h1>
          <p className="text-sm text-muted-foreground">
            Creá tu cuenta y empezá a gestionar tu lavadero
          </p>
        </div>

        {/* Error */}
        {error && (
          <InlineAlert variant="error" title="Error">
            {error}
          </InlineAlert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nombre del negocio</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="Mi Lavadero"
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              autoComplete="organization"
              autoFocus
              disabled={loading}
            />
            {fieldErrors.businessName && (
              <p className="text-xs text-destructive">{fieldErrors.businessName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Identificador (URL)</Label>
            <Input
              id="slug"
              type="text"
              placeholder="mi-lavadero"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
            {fieldErrors.slug && (
              <p className="text-xs text-destructive">{fieldErrors.slug}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Se usa como identificador único de tu negocio
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Tu nombre completo</Label>
            <Input
              id="ownerName"
              type="text"
              placeholder="Juan Pérez"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoComplete="name"
              disabled={loading}
            />
            {fieldErrors.ownerName && (
              <p className="text-xs text-destructive">{fieldErrors.ownerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear cuenta
          </Button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
