import { WhatsAppButton } from "./whatsapp-button";
import { MapPin, Phone, Clock } from "lucide-react";
import Link from "next/link";

export interface PublicFooterProps {
  tenantName?: string;
  address?: string;
  phone?: string;
  whatsappPhone?: string;
  hours?: string;
  className?: string;
}

export function PublicFooter({
  tenantName = "Lavadero",
  address,
  phone,
  whatsappPhone,
  hours,
}: PublicFooterProps) {
  return (
    <>
      <footer id="contacto" className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Datos del local */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold">{tenantName}</h3>
              {address && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {address}
                </p>
              )}
              {phone && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${phone}`} className="hover:underline">
                    {phone}
                  </a>
                </p>
              )}
              {hours && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  {hours}
                </p>
              )}
            </div>

            {/* Links */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/terminos"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacidad"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </div>

            {/* Redes / CTA */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contacto
              </h3>
              {whatsappPhone && (
                <WhatsAppButton
                  phone={whatsappPhone}
                  message={`Hola! Quiero consultar sobre los servicios de ${tenantName}`}
                  variant="cta"
                  label="Escribinos por WhatsApp"
                />
              )}
            </div>
          </div>

          <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {tenantName}. Potenciado por{" "}
            <a
              href="https://nereo.ar"
              className="font-medium text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nereo
            </a>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      {whatsappPhone && (
        <WhatsAppButton
          phone={whatsappPhone}
          message={`Hola! Quiero consultar sobre ${tenantName}`}
          variant="fab"
        />
      )}
    </>
  );
}
