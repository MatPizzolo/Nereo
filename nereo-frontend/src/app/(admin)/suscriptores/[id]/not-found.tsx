import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";
import Link from "next/link";

export default function SubscriberNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <UserX className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Suscriptor no encontrado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        El suscriptor que buscás no existe o fue eliminado.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin/suscriptores">Ver todos los suscriptores</Link>
      </Button>
    </div>
  );
}
