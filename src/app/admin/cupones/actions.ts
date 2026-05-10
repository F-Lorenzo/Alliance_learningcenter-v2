"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminCurrentRole } from "@/lib/admin-queries";

async function requireManagerRole() {
  const role = await getAdminCurrentRole();
  if (!["super_admin", "admin", "admin_profesor"].includes(role)) {
    throw new Error("Acceso denegado");
  }
}

export async function createCoupon(fd: FormData) {
  try {
    await requireManagerRole();

    const code = (fd.get("code") as string)?.trim().toUpperCase();
    const description = (fd.get("description") as string)?.trim() || null;
    const discount_type = fd.get("discount_type") as "percentage" | "fixed";
    const discount_value = parseFloat(fd.get("discount_value") as string);
    const applicable_plan = (fd.get("applicable_plan") as string) || "all";
    const max_uses_raw = (fd.get("max_uses") as string)?.trim();
    const max_uses = max_uses_raw ? parseInt(max_uses_raw) : null;
    const valid_until_raw = (fd.get("valid_until") as string)?.trim();
    const valid_until = valid_until_raw || null;

    if (!code) return { error: "El código es requerido" };
    if (!discount_type || !["percentage", "fixed"].includes(discount_type))
      return { error: "Tipo de descuento inválido" };
    if (isNaN(discount_value) || discount_value <= 0)
      return { error: "El valor del descuento debe ser mayor a 0" };
    if (discount_type === "percentage" && discount_value > 100)
      return { error: "El porcentaje no puede ser mayor a 100" };

    const db = createAdminClient();
    const { data, error } = await db
      .from("coupons")
      .insert({
        code,
        description,
        discount_type,
        discount_value,
        applicable_plan,
        max_uses,
        valid_until: valid_until ? new Date(valid_until).toISOString() : null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return { error: `Ya existe un cupón con el código "${code}"` };
      console.error("[cupones/create]", error.message);
      return { error: "Error al crear el cupón" };
    }

    return { coupon: data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error inesperado" };
  }
}

export async function toggleCoupon(id: string) {
  try {
    await requireManagerRole();
    const db = createAdminClient();

    const { data: current } = await db.from("coupons").select("is_active").eq("id", id).single();
    if (!current) return { ok: false, error: "Cupón no encontrado" };

    const { error } = await db
      .from("coupons")
      .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado" };
  }
}

export async function deleteCoupon(id: string) {
  try {
    await requireManagerRole();
    const db = createAdminClient();
    const { error } = await db.from("coupons").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado" };
  }
}
