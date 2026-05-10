import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — Alliance Learning Center",
  description: "Política de privacidad y tratamiento de datos personales de Alliance Learning Center.",
};

const LAST_UPDATED = "Mayo 2025";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="text-xs text-text-tertiary hover:text-gold transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-2xl font-medium text-text-primary mt-4">Política de Privacidad</h1>
          <p className="text-sm text-text-tertiary mt-1">Última actualización: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-sm text-text-secondary leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">1. Responsable del tratamiento</h2>
          <p>
            Alliance Learning Center, con domicilio en la República Argentina, es responsable del tratamiento de los datos personales recolectados a través de la plataforma en línea disponible en este sitio web ("el Servicio"). Este documento describe qué datos recopilamos, cómo los utilizamos y cuáles son sus derechos como titular de los datos.
          </p>
          <p className="mt-3">
            El tratamiento de datos personales se rige por la <strong className="text-text-primary">Ley N° 25.326 de Protección de Datos Personales</strong> de la República Argentina y sus normas complementarias.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">2. Datos que recopilamos</h2>
          <p className="mb-3">Recopilamos los siguientes datos personales:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong className="text-text-primary">Datos de registro:</strong> nombre completo, dirección de correo electrónico y contraseña (almacenada en formato cifrado).</li>
            <li><strong className="text-text-primary">Datos de facturación:</strong> CUIT/CUIL, razón social y condición ante AFIP, utilizados para la emisión de comprobantes fiscales.</li>
            <li><strong className="text-text-primary">Datos de uso:</strong> progreso en los módulos, lecciones vistas, notas personales y actividad dentro de la plataforma.</li>
            <li><strong className="text-text-primary">Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo y datos de sesión, recopilados automáticamente para garantizar el funcionamiento del Servicio.</li>
            <li><strong className="text-text-primary">Datos de pago:</strong> procesados exclusivamente por Mercado Pago. Alliance Learning Center no almacena datos de tarjetas de crédito ni cuentas bancarias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">3. Finalidad del tratamiento</h2>
          <p className="mb-3">Los datos personales son utilizados para:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Crear y gestionar la cuenta del usuario.</li>
            <li>Brindar acceso al contenido según el plan de suscripción contratado.</li>
            <li>Procesar pagos y emitir comprobantes fiscales (facturas AFIP).</li>
            <li>Registrar el progreso del usuario y personalizar la experiencia de aprendizaje.</li>
            <li>Enviar comunicaciones relacionadas con el Servicio (confirmación de cuenta, recuperación de contraseña, novedades de la plataforma).</li>
            <li>Cumplir con obligaciones legales y fiscales vigentes en la República Argentina.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">4. Base legal del tratamiento</h2>
          <p>
            El tratamiento de sus datos personales se basa en el consentimiento otorgado al momento del registro, en la ejecución del contrato de suscripción y en el cumplimiento de obligaciones legales aplicables.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">5. Compartición de datos con terceros</h2>
          <p className="mb-3">
            Alliance Learning Center no vende ni cede datos personales a terceros con fines comerciales. Los datos pueden ser compartidos únicamente con:
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong className="text-text-primary">Mercado Pago:</strong> para el procesamiento de pagos y suscripciones.</li>
            <li><strong className="text-text-primary">Supabase:</strong> proveedor de infraestructura de base de datos y autenticación.</li>
            <li><strong className="text-text-primary">Cloudflare (R2):</strong> almacenamiento seguro de contenido multimedia.</li>
            <li><strong className="text-text-primary">Autoridades competentes:</strong> cuando sea requerido por ley o resolución judicial.</li>
          </ul>
          <p className="mt-3">
            Todos los proveedores de servicios mencionados cuentan con sus propias políticas de privacidad y se comprometen contractualmente a tratar los datos de forma segura y confidencial.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">6. Almacenamiento y seguridad</h2>
          <p>
            Los datos son almacenados en servidores seguros con cifrado en tránsito (TLS) y en reposo. Implementamos medidas técnicas y organizativas adecuadas para proteger la información contra accesos no autorizados, pérdida o destrucción. Las contraseñas se almacenan utilizando algoritmos de hashing seguros y nunca en texto plano.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">7. Conservación de los datos</h2>
          <p>
            Los datos personales se conservan mientras la cuenta del usuario esté activa y durante el período adicional necesario para cumplir con obligaciones legales y fiscales (mínimo 10 años para documentación contable, conforme la normativa argentina). Tras la baja de la cuenta, los datos se eliminan o anonimizAN de forma segura, salvo los que deban conservarse por obligación legal.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">8. Derechos del titular</h2>
          <p className="mb-3">
            En conformidad con la Ley N° 25.326, el titular de los datos tiene derecho a:
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong className="text-text-primary">Acceso:</strong> solicitar información sobre los datos personales que tenemos registrados.</li>
            <li><strong className="text-text-primary">Rectificación:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong className="text-text-primary">Supresión:</strong> solicitar la eliminación de sus datos personales (sujeto a obligaciones legales).</li>
            <li><strong className="text-text-primary">Oposición:</strong> oponerse al tratamiento de sus datos para fines de comunicaciones comerciales.</li>
          </ul>
          <p className="mt-3">
            Para ejercer estos derechos, contactenos a través de los canales oficiales de la plataforma. Responderemos dentro de los plazos establecidos por la normativa vigente.
          </p>
          <p className="mt-3 text-xs text-text-tertiary">
            La Dirección Nacional de Protección de Datos Personales (DNPDP) es el organismo de control en la materia. Para más información: <span className="text-gold">www.argentina.gob.ar/aaip/datospersonales</span>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">9. Cookies y tecnologías similares</h2>
          <p>
            El Servicio utiliza cookies de sesión esenciales para el funcionamiento de la autenticación y el mantenimiento de la sesión del usuario. No utilizamos cookies de seguimiento publicitario de terceros. Al usar el Servicio, el usuario acepta el uso de estas cookies esenciales.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">10. Modificaciones</h2>
          <p>
            Alliance Learning Center puede actualizar esta Política de Privacidad. Las modificaciones serán notificadas por correo electrónico o mediante aviso en la plataforma. El uso continuado del Servicio implica la aceptación de la política actualizada.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">11. Contacto</h2>
          <p>
            Para consultas, solicitudes de ejercicio de derechos o cualquier cuestión relacionada con el tratamiento de sus datos personales, puede contactarnos a través de los canales oficiales de la plataforma.
          </p>
        </section>

      </div>

      {/* Footer mínimo */}
      <div className="border-t border-border-default">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-xs text-text-tertiary">
          <Link href="/terminos" className="hover:text-gold transition-colors">Términos</Link>
          <Link href="/afip" className="hover:text-gold transition-colors">AFIP</Link>
        </div>
      </div>
    </div>
  );
}
