import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Información Fiscal (AFIP) — Alliance Learning Center",
  description: "Información fiscal y facturación electrónica de Alliance Learning Center.",
};

export default function AfipPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="text-xs text-text-tertiary hover:text-gold transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-medium text-text-primary mt-4">Información Fiscal</h1>
          <p className="text-sm text-text-tertiary mt-1">Facturación electrónica y obligaciones impositivas</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-sm text-text-secondary leading-relaxed">

        {/* Info destacada */}
        <div className="bg-bg-secondary border border-gold/20 rounded-xl p-5">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-2">Emisión de comprobantes</p>
          <p>
            Alliance Learning Center emite <strong className="text-text-primary">facturas electrónicas</strong> a través del sistema de facturación electrónica de AFIP por cada cobro realizado. El comprobante es enviado automáticamente al correo electrónico registrado en tu cuenta.
          </p>
        </div>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Datos del prestador del servicio</h2>
          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Razón social", "Alliance Learning Center"],
                  ["Actividad", "Servicios de enseñanza a distancia / Plataforma educativa en línea"],
                  ["País", "República Argentina"],
                  ["Moneda de facturación", "Pesos Argentinos (ARS)"],
                  ["Procesador de pagos", "Mercado Pago S.A."],
                ].map(([key, value], i) => (
                  <tr key={key} className={i % 2 === 0 ? "bg-bg-tertiary/40" : ""}>
                    <td className="px-5 py-3 font-medium text-text-primary w-44">{key}</td>
                    <td className="px-5 py-3 text-text-secondary">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">¿Cómo recibo mi factura?</h2>
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong className="text-text-primary">Completá tus datos fiscales</strong> en <Link href="/dashboard/cuenta" className="text-gold hover:underline">Mi cuenta</Link>: CUIT/CUIL, razón social y condición ante AFIP (Consumidor Final, Responsable Inscripto, Monotributista, etc.).
            </li>
            <li>
              <strong className="text-text-primary">Al realizarse cada cobro</strong> (mensual o anual), generamos el comprobante electrónico de forma automática.
            </li>
            <li>
              <strong className="text-text-primary">Recibís la factura</strong> en el correo electrónico asociado a tu cuenta, en formato PDF con CAE (Código de Autorización Electrónico) de AFIP.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Tipos de comprobantes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                tipo: "Factura B",
                para: "Consumidores Finales y Monotributistas",
                desc: "Incluye IVA en el precio final. Es el comprobante más habitual para usuarios individuales.",
              },
              {
                tipo: "Factura A",
                para: "Responsables Inscriptos en IVA",
                desc: "Discrimina el IVA. Requiere informar CUIT y razón social como Responsable Inscripto.",
              },
              {
                tipo: "Factura C",
                para: "Exentos y no responsables",
                desc: "Para contribuyentes exentos o no alcanzados por el IVA.",
              },
            ].map((item) => (
              <div key={item.tipo} className="bg-bg-secondary border border-border-default rounded-xl p-4">
                <p className="text-base font-semibold text-gold mb-1">{item.tipo}</p>
                <p className="text-xs font-medium text-text-primary mb-2">{item.para}</p>
                <p className="text-xs text-text-tertiary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">IVA y precios</h2>
          <p>
            Los precios publicados en el Servicio son <strong className="text-text-primary">precios finales en ARS</strong>. La condición impositiva aplicable depende de la categoría del suscriptor:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-3">
            <li>Consumidores Finales y Monotributistas: el precio incluye IVA (21%).</li>
            <li>Responsables Inscriptos: el IVA se discrimina en la Factura A.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Preguntas frecuentes sobre facturación</h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Puedo cambiar mis datos fiscales después del registro?",
                a: "Sí, podés actualizar tu CUIT, razón social y condición ante AFIP en cualquier momento desde Mi cuenta. Los cambios aplicarán a los próximos comprobantes.",
              },
              {
                q: "¿Qué pasa si no cargo mis datos fiscales?",
                a: "Si no completás tus datos, emitimos la factura como Consumidor Final. Podés actualizar tus datos y solicitar la refacturación de comprobantes recientes.",
              },
              {
                q: "¿Puedo pedir la factura de un cobro anterior?",
                a: "Sí. Si no recibiste algún comprobante o necesitás refacturación, contactanos indicando la fecha del cobro y tus datos fiscales.",
              },
              {
                q: "¿El servicio paga percepciones provinciales?",
                a: "El servicio puede estar sujeto a percepciones de Ingresos Brutos según la jurisdicción del suscriptor. Estas se incluyen en el comprobante cuando corresponde.",
              },
            ].map((item) => (
              <div key={item.q} className="border border-border-default rounded-lg p-4">
                <p className="font-medium text-text-primary mb-1.5">{item.q}</p>
                <p className="text-text-tertiary text-xs leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Verificación en AFIP</h2>
          <p>
            Todos los comprobantes emitidos por Alliance Learning Center son válidos y pueden verificarse en el portal oficial de AFIP mediante el CAE incluido en la factura.
          </p>
          <a
            href="https://www.afip.gob.ar/fe/qr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-gold text-xs hover:underline"
          >
            Verificar comprobante en AFIP →
          </a>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">Contacto por facturación</h2>
          <p>
            Para consultas relacionadas con facturación, CUIT o comprobantes, contactanos a través de los canales oficiales de la plataforma y te responderemos a la brevedad.
          </p>
        </section>

      </div>

      {/* Footer mínimo */}
      <div className="border-t border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-xs text-text-tertiary">
          <Link href="/terminos" className="hover:text-gold transition-colors">Términos</Link>
          <Link href="/privacidad" className="hover:text-gold transition-colors">Privacidad</Link>
        </div>
      </div>
    </div>
  );
}
