import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Fetch tenant data from API based on [slug]
  const tenantName = "Lavadero";
  const whatsappPhone = "";

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader tenantName={tenantName} />
      <main className="flex-1">{children}</main>
      <PublicFooter tenantName={tenantName} whatsappPhone={whatsappPhone} />
    </div>
  );
}
