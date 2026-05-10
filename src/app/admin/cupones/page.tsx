import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminCurrentRole } from "@/lib/admin-queries";
import { redirect } from "next/navigation";
import { CuponesClient } from "./cupones-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cupones — Admin" };

export default async function CuponesPage() {
  const role = await getAdminCurrentRole();
  if (!["super_admin", "admin", "admin_profesor"].includes(role)) redirect("/admin");

  const db = createAdminClient();
  const { data: coupons } = await db
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return <CuponesClient initialCoupons={coupons ?? []} />;
}
