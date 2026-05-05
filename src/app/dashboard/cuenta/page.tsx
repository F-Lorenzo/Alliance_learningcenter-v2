import { redirect } from "next/navigation";
import { getCurrentUser, getSubscription } from "@/lib/queries";
import { logout } from "@/app/actions";
import { CuentaClient } from "./cuenta-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/cuenta");

  const subscription = await getSubscription(user.id);

  return (
    <CuentaClient
      user={{
        name: user.name,
        email: user.email,
        razon_social: user.razon_social,
        cuit: user.cuit,
        condicion_iva: user.condicion_iva,
      }}
      subscription={subscription}
      onLogout={logout}
    />
  );
}
