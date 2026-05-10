import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Alliance Learning Center",
  description: "Términos y condiciones de uso de Alliance Learning Center.",
};

const LAST_UPDATED = "Mayo 2025";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="text-xs text-text-tertiary hover:text-gold transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-medium text-text-primary mt-4">Términos y Condiciones</h1>
          <p className="text-sm text-text-tertiary mt-1">Última actualización: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-sm text-text-secondary leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">1. Aceptación de los términos</h2>
          <p>
            Al acceder y utilizar Alliance Learning Center ("el Servicio"), usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio. El Servicio es operado por Alliance Learning Center, con domicilio en la República Argentina.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">2. Descripción del servicio</h2>
          <p>
            Alliance Learning Center es una plataforma de aprendizaje en línea orientada a la enseñanza de jiu jitsu brasileño. El Servicio ofrece acceso a módulos de video, técnicas, y contenido educativo relacionado con las artes marciales, disponible mediante suscripción mensual o anual.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">3. Registro y cuenta de usuario</h2>
          <p className="mb-3">
            Para acceder al contenido del Servicio, el usuario debe crear una cuenta proporcionando una dirección de correo electrónico válida y una contraseña. El usuario es responsable de:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-text-secondary">
            <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
            <li>Toda la actividad que ocurra bajo su cuenta.</li>
            <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
          </ul>
          <p className="mt-3">
            El usuario declara ser mayor de 18 años o contar con autorización de su representante legal para utilizar el Servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">4. Suscripciones y pagos</h2>
          <p className="mb-3">
            El acceso al contenido premium requiere una suscripción activa. Los planes disponibles son:
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong className="text-text-primary">Plan Mensual:</strong> facturación mensual automática.</li>
            <li><strong className="text-text-primary">Plan Anual:</strong> facturación anual con descuento respecto al plan mensual.</li>
          </ul>
          <p className="mt-3">
            Los pagos se procesan a través de Mercado Pago. Los precios se expresan en pesos argentinos (ARS) e incluyen IVA cuando corresponda. Alliance Learning Center se reserva el derecho de modificar los precios con un preaviso de 30 días.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">5. Cancelación y reembolsos</h2>
          <p className="mb-3">
            El usuario puede cancelar su suscripción en cualquier momento desde su cuenta. La cancelación tomará efecto al final del período de facturación en curso, permitiendo el acceso al contenido hasta esa fecha.
          </p>
          <p>
            No se realizan reembolsos por períodos parciales, salvo en los casos previstos por la Ley de Defensa del Consumidor N° 24.240 y sus modificatorias. En caso de fallas técnicas imputables al Servicio, se evaluará cada caso individualmente.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">6. Propiedad intelectual</h2>
          <p>
            Todo el contenido disponible en el Servicio (videos, textos, imágenes, marcas, logotipos y material didáctico) es propiedad de Alliance Learning Center o de sus licenciantes y está protegido por las leyes de propiedad intelectual de la República Argentina y tratados internacionales. Queda expresamente prohibida la reproducción, distribución, modificación o cualquier uso no autorizado del contenido sin el consentimiento previo y por escrito de Alliance Learning Center.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">7. Uso permitido</h2>
          <p className="mb-3">El usuario se compromete a utilizar el Servicio exclusivamente para fines personales y no comerciales, y a no:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Compartir su cuenta con terceros.</li>
            <li>Descargar, grabar o redistribuir el contenido del Servicio.</li>
            <li>Utilizar el Servicio con fines ilegales o contrarios a las buenas costumbres.</li>
            <li>Intentar acceder sin autorización a sistemas o redes relacionados con el Servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">8. Limitación de responsabilidad</h2>
          <p>
            Alliance Learning Center no garantiza que el Servicio esté disponible de forma ininterrumpida o libre de errores. En la máxima medida permitida por la ley argentina, Alliance Learning Center no será responsable por daños indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de uso del Servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">9. Modificaciones</h2>
          <p>
            Alliance Learning Center se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados al usuario por correo electrónico o mediante un aviso en la plataforma con al menos 15 días de anticipación. El uso continuado del Servicio tras dicha notificación implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">10. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero que pudiera corresponder.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">11. Contacto</h2>
          <p>
            Para consultas relacionadas con estos Términos, podés contactarnos a través del correo electrónico indicado en la plataforma o mediante los canales oficiales de comunicación de Alliance Learning Center.
          </p>
        </section>

      </div>

      {/* Footer mínimo */}
      <div className="border-t border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-xs text-text-tertiary">
          <Link href="/privacidad" className="hover:text-gold transition-colors">Privacidad</Link>
          <Link href="/afip" className="hover:text-gold transition-colors">AFIP</Link>
        </div>
      </div>
    </div>
  );
}
