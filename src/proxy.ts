import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si las env vars no están disponibles, dejar pasar sin verificar sesión.
  // Esto evita un crash de 500 en caso de misconfiguration de Vercel.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[proxy] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas.");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Rutas del dashboard: requieren login ─────────────────────
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── Rutas del admin: protección por roles ────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Leer rol desde JWT (sin query a DB en el caso feliz)
    const role = (user.app_metadata?.role as string | undefined) ?? "";

    // Roles con acceso al panel
    const ADMIN_ROLES = ["super_admin", "admin", "admin_profesor", "profesor"];
    // Roles con acceso a usuarios/cobros (no profesor)
    const MANAGER_ROLES = ["super_admin", "admin", "admin_profesor"];

    let hasAccess = ADMIN_ROLES.includes(role);

    // Fallback a tabla admins para usuarios sin role en JWT (pre-migración)
    if (!hasAccess) {
      const { data: adminRecord } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminRecord) hasAccess = true;
    }

    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Profesor solo puede acceder a /admin/cursos, /admin/profesores y /admin (overview)
    if (role === "profesor") {
      const allowedForProfesor = ["/admin/cursos", "/admin"];
      const allowed = allowedForProfesor.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/cursos";
        return NextResponse.redirect(url);
      }
    }

    // Admin no puede acceder a gestión de roles (solo super_admin)
    // (la restricción de UI la hace el panel; aquí no hay ruta dedicada todavía)
  }

  // ── Si ya está logueado, redirigir de login/registro al dashboard
  if (
    user &&
    (pathname === "/login" || pathname === "/registro")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
