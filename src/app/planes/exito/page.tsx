import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suscripción activada" };

export default function ExitoPage() {
  return (
    <>
      <Navbar user={null} />
      <main className="flex-1 flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
          <h1 className="text-2xl font-medium text-text-primary mb-2">
            ¡Tu suscripción está activa!
          </h1>
          <p className="text-text-secondary mb-8">
            Ya podés acceder a todos los módulos y técnicas de Alliance Learning Center.
          </p>
          <Link href="/dashboard">
            <Button variant="primary" size="lg">Ir al dashboard</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
