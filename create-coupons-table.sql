-- ── Tabla de cupones de descuento ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,              -- ej: "ALLIANCE20"
  description      TEXT,                              -- nota interna del admin
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value   NUMERIC(10,2) NOT NULL,            -- % o ARS según tipo
  applicable_plan  TEXT NOT NULL DEFAULT 'all'
                     CHECK (applicable_plan IN ('monthly', 'yearly', 'all')),
  max_uses         INTEGER,                           -- NULL = ilimitado
  current_uses     INTEGER NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ,                       -- NULL = desde siempre
  valid_until      TIMESTAMPTZ,                       -- NULL = sin vencimiento
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS: solo service_role puede leer/escribir (todo va por API routes con admin client)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- No agregamos políticas públicas: el admin client bypasea RLS

-- Índice para búsqueda por código (case-insensitive)
CREATE INDEX IF NOT EXISTS coupons_code_idx ON coupons (LOWER(code));

-- Función atómica para incrementar usos (evita race condition)
CREATE OR REPLACE FUNCTION increment_coupon_uses(coupon_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE coupons SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = coupon_id;
$$;

-- Ejemplo de cupón
-- INSERT INTO coupons (code, description, discount_type, discount_value, applicable_plan, max_uses)
-- VALUES ('BIENVENIDO', '20% off primer mes', 'percentage', 20, 'monthly', 100);
