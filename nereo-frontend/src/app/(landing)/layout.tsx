import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nereo — Digitalizá tu lavadero",
  description:
    "Plataforma de gestión integral para lavaderos de autos. Turnos, membresías, pagos y métricas en tiempo real.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
