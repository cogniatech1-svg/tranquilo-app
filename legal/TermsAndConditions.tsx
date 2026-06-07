/**
 * legal/TermsAndConditions.tsx
 *
 * Fuente única de verdad para los Términos y Condiciones de Tranquilo.
 * Exporta:
 *   - openTermsAndConditions()    → helper centralizado de navegación
 *   - TERMS_LAST_UPDATED          → fecha de última actualización
 *   - TERMS_SECTIONS              → contenido real de los términos
 *   - TermsContent                → componente visual reutilizable
 */

// ── Helper de navegación centralizado ─────────────────────────────────────────

/**
 * Abre los Términos y Condiciones completos en una nueva pestaña.
 * Centralizado aquí para facilitar cambios futuros (ej: modal, ruta interna, etc.)
 */
export function openTermsAndConditions(): void {
  if (typeof window !== 'undefined') {
    window.open('/terms', '_blank', 'noopener,noreferrer')
  }
}

// ── Tipos de contenido ─────────────────────────────────────────────────────────

export interface TermsItem {
  /** Título en negrita del ítem. Opcional — algunos ítems son solo cuerpo o bullets. */
  title?: string
  /** Párrafo de texto. */
  body?: string
  /** Lista de puntos. Puede combinarse con title. */
  bullets?: string[]
  /** Enlace opcional al final del ítem (ej: email de contacto). */
  link?: { label: string; href: string }
}

export interface TermsSection {
  id: string
  emoji: string
  title: string
  items: TermsItem[]
}

// ── Fecha de actualización ─────────────────────────────────────────────────────

export const TERMS_LAST_UPDATED = 'Junio de 2026'

// ── Contenido real de los términos ────────────────────────────────────────────

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'acceptance',
    emoji: '✅',
    title: 'Aceptación de los términos',
    items: [
      {
        body: 'Al acceder, registrarse o utilizar Tranquilo, el usuario acepta estos Términos y Condiciones y la Política de Privacidad vigente.',
      },
      {
        body: 'Si el usuario no está de acuerdo con estos términos, deberá abstenerse de utilizar la aplicación.',
      },
    ],
  },
  {
    id: 'description',
    emoji: '📱',
    title: 'Descripción del servicio',
    items: [
      {
        body: 'Tranquilo es una aplicación de gestión financiera personal diseñada para ayudar a los usuarios a registrar ingresos, gastos, presupuestos, categorías y metas financieras personales.',
      },
      {
        body: 'La aplicación tiene fines exclusivamente informativos y organizativos. Tranquilo no es una entidad financiera, banco, cooperativa, fondo de inversión ni asesor financiero profesional.',
      },
    ],
  },
  {
    id: 'permitted-use',
    emoji: '👤',
    title: 'Uso permitido',
    items: [
      {
        title: 'El usuario se compromete a',
        bullets: [
          'utilizar la aplicación de manera legal y responsable',
          'proporcionar información veraz cuando sea requerida',
          'mantener la confidencialidad de sus credenciales de acceso',
          'no utilizar la plataforma para actividades fraudulentas, ilícitas o que puedan afectar a otros usuarios',
        ],
      },
    ],
  },
  {
    id: 'restrictions',
    emoji: '🚫',
    title: 'Restricciones de uso',
    items: [
      {
        title: 'Está prohibido',
        bullets: [
          'intentar acceder a cuentas de terceros',
          'manipular, alterar o interferir con el funcionamiento de la aplicación',
          'realizar ingeniería inversa, descompilación o extracción no autorizada del código',
          'utilizar herramientas automatizadas para afectar la disponibilidad del servicio',
        ],
      },
    ],
  },
  {
    id: 'financial-info',
    emoji: '📊',
    title: 'Información financiera',
    items: [
      {
        body: 'Los cálculos, estadísticas, proyecciones, presupuestos, recomendaciones e insights generados por Tranquilo tienen fines orientativos.',
      },
      {
        title: 'El usuario reconoce que',
        bullets: [
          'los resultados pueden contener errores',
          'las proyecciones no garantizan resultados futuros',
          'las decisiones financieras siguen siendo responsabilidad exclusiva del usuario',
        ],
      },
      {
        body: 'Tranquilo no ofrece asesoría financiera, tributaria, contable, legal o de inversión.',
      },
    ],
  },
  {
    id: 'availability',
    emoji: '⚙️',
    title: 'Disponibilidad del servicio',
    items: [
      {
        body: 'Aunque se realizan esfuerzos razonables para mantener la disponibilidad de la plataforma, no se garantiza que el servicio sea continuo, ininterrumpido o libre de errores.',
      },
      {
        body: 'El servicio podrá suspenderse temporalmente por mantenimiento, mejoras técnicas o circunstancias fuera del control de los desarrolladores.',
      },
    ],
  },
  {
    id: 'accounts',
    emoji: '🔑',
    title: 'Cuentas de usuario',
    items: [
      {
        title: 'El usuario es responsable de',
        bullets: [
          'mantener segura su contraseña',
          'proteger el acceso a sus dispositivos',
          'notificar cualquier uso no autorizado de su cuenta',
        ],
      },
      {
        body: 'El usuario es responsable de toda actividad realizada desde su cuenta.',
      },
    ],
  },
  {
    id: 'ip',
    emoji: '🏛️',
    title: 'Propiedad intelectual',
    items: [
      {
        body: 'Todos los elementos de Tranquilo, incluyendo diseño, interfaces, logotipos, textos, funcionalidades, bases de datos y código fuente, están protegidos por las leyes aplicables de propiedad intelectual.',
      },
      {
        body: 'El uso de la aplicación no concede al usuario ningún derecho de propiedad sobre dichos elementos.',
      },
    ],
  },
  {
    id: 'export',
    emoji: '📤',
    title: 'Exportación y respaldo de datos',
    items: [
      {
        body: 'La aplicación puede ofrecer funcionalidades de exportación de datos.',
      },
      {
        title: 'El usuario reconoce que',
        bullets: [
          'los archivos exportados son responsabilidad del usuario',
          'el usuario debe proteger adecuadamente dichos archivos',
          'Tranquilo no se hace responsable por accesos no autorizados a archivos exportados almacenados por el usuario',
        ],
      },
    ],
  },
  {
    id: 'deletion',
    emoji: '🗑️',
    title: 'Eliminación de cuenta',
    items: [
      {
        body: 'El usuario podrá solicitar o ejecutar la eliminación de su cuenta conforme a las funcionalidades disponibles dentro de la aplicación.',
      },
      {
        body: 'La eliminación de cuenta implica la pérdida permanente de los datos asociados y puede ser irreversible.',
      },
      {
        body: 'Los detalles del tratamiento y conservación de datos se describen en la Política de Privacidad.',
      },
    ],
  },
  {
    id: 'service-changes',
    emoji: '🔧',
    title: 'Modificaciones del servicio',
    items: [
      {
        body: 'Tranquilo podrá agregar, modificar o retirar funcionalidades cuando sea necesario para mejorar la aplicación, cumplir requisitos legales o garantizar la seguridad del servicio.',
      },
    ],
  },
  {
    id: 'terms-changes',
    emoji: '🔄',
    title: 'Modificaciones de estos términos',
    items: [
      {
        body: 'Estos Términos y Condiciones podrán actualizarse periódicamente.',
      },
      {
        body: 'La fecha de última actualización se mostrará en este documento. El uso continuado de la aplicación después de una actualización constituye aceptación de los términos vigentes.',
      },
    ],
  },
  {
    id: 'liability',
    emoji: '⚖️',
    title: 'Limitación de responsabilidad',
    items: [
      {
        body: 'En la máxima medida permitida por la ley aplicable, Tranquilo y sus desarrolladores no serán responsables por:',
        bullets: [
          'pérdidas financieras directas o indirectas',
          'decisiones tomadas con base en la información de la aplicación',
          'errores de terceros proveedores',
          'interrupciones del servicio',
          'pérdida de datos ocasionada por factores externos fuera de control razonable',
        ],
      },
    ],
  },
  {
    id: 'law',
    emoji: '🌎',
    title: 'Legislación aplicable',
    items: [
      {
        body: 'Estos términos se interpretarán de acuerdo con las leyes de la República de Colombia, sin perjuicio de los derechos que correspondan a los usuarios conforme a la normativa de protección al consumidor y protección de datos aplicable.',
      },
    ],
  },
  {
    id: 'contact',
    emoji: '📬',
    title: 'Contacto',
    items: [
      {
        body: 'Para consultas relacionadas con estos Términos y Condiciones o con el uso de la aplicación, escríbenos a:',
        link: { label: 'cogniatech.1@gmail.com', href: 'mailto:cogniatech.1@gmail.com' },
      },
    ],
  },
  {
    id: 'privacy-relation',
    emoji: '🔗',
    title: 'Relación con la Política de Privacidad',
    items: [
      {
        body: 'Estos Términos y Condiciones deben leerse conjuntamente con la Política de Privacidad de Tranquilo.',
      },
      {
        body: 'En caso de conflicto respecto al tratamiento de datos personales, prevalecerá lo establecido en la Política de Privacidad.',
      },
    ],
  },
]

// ── Componente visual ──────────────────────────────────────────────────────────

interface TermsContentProps {
  /** Muestra encabezado completo (para /terms). false = solo contenido embebido. */
  showHeader?: boolean
}

export function TermsContent({ showHeader = true }: TermsContentProps) {
  return (
    <div
      style={{
        fontFamily:
          'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#F8FAFC',
        minHeight: showHeader ? '100vh' : undefined,
        color: '#0F172A',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: showHeader ? '48px 24px 80px' : '24px 0 40px',
        }}
      >
        {showHeader && (
          <>
            {/* Marca */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '48px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192-verde.png"
                alt="Tranquilo"
                style={{ width: '36px', height: '36px', borderRadius: '10px' }}
              />
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.3px',
                }}
              >
                Tranquilo
              </span>
            </div>

            {/* Encabezado */}
            <div style={{ marginBottom: '48px' }}>
              <h1
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.8px',
                  lineHeight: 1.15,
                }}
              >
                Términos y Condiciones
              </h1>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  color: '#64748B',
                  lineHeight: 1.6,
                  maxWidth: '480px',
                }}
              >
                Las reglas de uso de Tranquilo, explicadas en lenguaje claro. Sin letra chica.
              </p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  color: '#94A3B8',
                  background: '#F1F5F9',
                  padding: '4px 10px',
                  borderRadius: '20px',
                }}
              >
                Última actualización: {TERMS_LAST_UPDATED}
              </span>
            </div>
          </>
        )}

        {/* Secciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {TERMS_SECTIONS.map((section) => (
            <div key={section.id}>
              {/* Título de sección */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <span style={{ fontSize: '22px' }}>{section.emoji}</span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {section.title}
                </h2>
              </div>

              {/* Ítems */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {section.items.map((item, idx) => (
                  <div key={idx} style={{ paddingLeft: '32px' }}>
                    {/* Título del ítem */}
                    {item.title && (
                      <p
                        style={{
                          margin: '0 0 6px 0',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1E293B',
                        }}
                      >
                        {item.title}
                      </p>
                    )}

                    {/* Cuerpo de texto */}
                    {item.body && (
                      <p
                        style={{
                          margin: item.link || item.bullets ? '0 0 8px 0' : 0,
                          fontSize: '14px',
                          color: '#64748B',
                          lineHeight: 1.65,
                        }}
                      >
                        {item.body}
                      </p>
                    )}

                    {/* Enlace (ej: email de contacto) */}
                    {item.link && (
                      <a
                        href={item.link.href}
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0D6259',
                          textDecoration: 'underline',
                          textDecorationColor: 'rgba(13,98,89,0.35)',
                        }}
                      >
                        {item.link.label}
                      </a>
                    )}

                    {/* Bullets */}
                    {item.bullets && (
                      <ul
                        style={{
                          margin: item.title ? '4px 0 0 0' : 0,
                          padding: '0 0 0 18px',
                          listStyle: 'disc',
                        }}
                      >
                        {item.bullets.map((bullet, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: '14px',
                              color: '#64748B',
                              lineHeight: 1.7,
                              paddingLeft: '4px',
                            }}
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {showHeader && (
          <div
            style={{
              marginTop: '64px',
              paddingTop: '24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              © {new Date().getFullYear()} Tranquilo. Todos los derechos reservados.
            </p>
            <a
              href="mailto:cogniatech.1@gmail.com"
              style={{ fontSize: '13px', color: '#94A3B8', textDecoration: 'none' }}
            >
              cogniatech.1@gmail.com
            </a>
            <a
              href="/privacy"
              style={{ fontSize: '13px', color: '#94A3B8', textDecoration: 'none' }}
            >
              Política de Privacidad
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
