# Pruebas end-to-end del flujo de compra, cancelación y auth

Este documento nace del incidente de septiembre/2026: un cliente pagó y su cuenta no se activó
porque la URL del webhook en Mercado Pago apuntaba al dominio sin "www", que Vercel redirige — y
un redirect en un POST rompe la entrega. **Nada de esto se detectaba con tests de código**, porque
el problema no estaba en la lógica sino en la configuración de infraestructura (DNS + Vercel +
panel de Mercado Pago). Por eso hay tres capas distintas, cada una cubriendo lo que las otras no
pueden:

| Capa | Qué prueba | Qué NO puede agarrar |
|---|---|---|
| 1. Tests automáticos (`npx vitest run`) | La lógica de negocio: cálculo de períodos, idempotencia, quién tiene acceso, qué hace cada handler ante cada evento | Nada de infraestructura real: dominio, DNS, redirects, si el secreto de Vercel coincide con el de Mercado Pago |
| 2. Script manual (`check-webhook-health.mjs`) | El camino HTTP real contra la URL pública (redirects, firma, alcance) | Que Mercado Pago realmente sepa la URL correcta, o que los eventos correctos estén habilitados en su panel |
| 3. Checklist manual con Mercado Pago real | Todo el recorrido real de un pago, de punta a punta | — (es la única capa que hubiera agarrado el incidente real) |

Más el **cron de salud automático** (capa 2 corriendo sola, todos los días) y el **banner del panel
admin**, que avisan si esto se vuelve a romper sin que necesites acordarte de correr nada.

## 1. Tests automáticos (recorridos completos)

```bash
npx vitest run
```

Además de los tests por archivo/función, `src/test-utils/e2e-journeys.test.ts` encadena los
handlers reales (checkout → webhook → acceso → cancelación → re-suscripción) en las secuencias
completas que vive un cliente real, incluyendo el recorrido exacto del incidente reportado
("cliente se da de baja y vuelve a pagar con una preapproval nueva"). Para correr solo esos:

```bash
npx vitest run src/test-utils/e2e-journeys.test.ts --reporter=verbose
```

Todo corre contra fakes en memoria (Supabase y Mercado Pago simulados) — nunca toca producción,
nunca gasta dinero, no necesita credenciales reales.

## 2. Script manual: `check-webhook-health.mjs`

Prueba el camino HTTP real (DNS + Vercel + redirects + firma) contra la URL pública, sin llamar a
la API de Mercado Pago ni tocar ninguna suscripción real.

```bash
node scripts/check-webhook-health.mjs
```

Correlo:
- Después de cambiar la URL del webhook en el panel de Mercado Pago.
- Después de rotar `MP_WEBHOOK_SECRET` (en Vercel **y** en Mercado Pago).
- Después de cualquier cambio de dominio/DNS en Vercel.
- Antes de confiar en un deploy que toca `src/app/api/webhooks/mp`.
- Cuando el panel admin muestre el banner de alerta (ver más abajo).

Necesita `MP_WEBHOOK_SECRET` — lee `.env.local` si lo tenés ahí, o pasalo con `--secret=xxxx`
(copiado del panel de Mercado Pago o de Vercel). Si la URL redirige, el script lo va a decir
explícitamente en vez de seguir el redirect en silencio — es la comprobación que hubiera agarrado
el incidente real el mismo día que pasó.

## 3. Checklist manual con Mercado Pago real (antes de un deploy grande, o si algo se ve raro)

Esta es la única capa que prueba el sistema END A END de verdad. Usá las **credenciales de
prueba** de Mercado Pago (panel de Mercado Pago → Developers → Credenciales de prueba /
Cuentas de prueba / Tarjetas de prueba) para no mover plata real.

1. **Confirmá la config del webhook en Mercado Pago** (Developers → tu app → Webhooks):
   - URL de producción: `https://www.alliancebaireslearningcenter.com/api/webhooks/mp`
     (con `www` — el dominio sin `www` redirige y rompe la entrega).
   - Eventos: "Planes y suscripciones" y "Pagos" (o "Pagos (legacy)") tildados.
   - Simulá una notificación desde ese mismo panel y confirmá que da **200**, no 3xx/4xx/5xx.
2. **Hacé una suscripción real de prueba**: entrá al sitio con una cuenta de prueba, andá a
   `/planes`, suscribite con una tarjeta de prueba de Mercado Pago.
3. Confirmá, en Supabase (SQL Editor):
   ```sql
   select * from webhook_events order by created_at desc limit 5;
   select * from subscriptions where user_id = '<id del usuario de prueba>';
   ```
   Debe aparecer al menos un evento `processed` y la fila de `subscriptions` en `active` con
   `mp_subscription_id` cargado.
4. **Probá cancelar** desde "Mi cuenta" y confirmá en Mercado Pago (panel de la cuenta de prueba)
   que la preapproval quedó `cancelled`, y en Supabase que la fila sigue dando acceso hasta
   `current_period_end`.
5. **Probá volver a suscribirte** con la misma cuenta de prueba (el escenario exacto del
   incidente): confirmá que se activa sola, sin que haga falta tocar el panel admin.
6. Repetí el paso 1 (simular notificación) una vez más al final, para dejar todo como estaba.

## Monitoreo continuo (no hace falta acordarse de nada)

- **Cron de salud** (`/api/cron/webhook-healthcheck`, configurado en `vercel.json`): manda un ping
  firmado real a la URL pública todos los días y guarda el resultado en
  `webhook_health_checks` (requiere haber corrido `create-webhook-health-checks-table.sql` en
  Supabase). Si tu plan de Vercel permite crons más frecuentes que una vez al día, podés ajustar
  el `schedule` en `vercel.json`.
- **Banner en el panel admin**: aparece automáticamente en `/admin/*` si el último chequeo del
  cron falló, o si hubo notificaciones reales de Mercado Pago fallidas en las últimas 24 horas.
  Si no ves ningún banner, está todo bien — no hace falta ir a revisar nada activamente.
- **Opcional, más seguro**: agregá una variable de entorno `CRON_SECRET` en Vercel (cualquier
  string largo y random) para que el endpoint del cron exija autenticación. Sin ella, el endpoint
  igual funciona (Vercel se lo dispara solo), pero cualquiera podría dispararlo manualmente — el
  peor caso es una fila extra e inofensiva en `webhook_health_checks`, nunca un cambio de datos
  real.
