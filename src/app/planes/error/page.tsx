import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Error en el pago" };

export default function ErrorPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-sm">
          <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
          <h1 className="text-2xl font-medium text-text-primary mb-2">
            Hubo un problema con el pago
          </h1>
          <p className="text-text-secondary mb-8">
            No pudimos procesar tu pago. Podés intentar de nuevo o contactarnos por WhatsApp.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/planes">
              <Button variant="primary" size="lg" fullWidth>Reintentar</Button>
            </Link>
            <Button variant="ghost" size="lg" fullWidth>
              Contactar soporte
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
