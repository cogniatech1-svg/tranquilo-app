/**
 * legal/TermsAndConditions.tsx
 *
 * Fuente única de verdad para los Términos y Condiciones de Tranquilo.
 * Exporta:
 *   - openTermsAndConditions()   → helper centralizado de navegación
 *   - TERMS_LAST_UPDATED         → fecha de última actualización
 *   - TERMS_SECTIONS             → contenido real de los términos
 *   - TermsContent               → componente visual reutilizable
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
  /** Título en negrita del ítem. Opcional. */
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
        body: 'Al acceder o usar Tranquilo — ya sea como usuario registrado o como usuario sin cuenta — aceptas estos Términos y Condiciones en su totalidad.',
      },
      {
        body: 'Si no estás de acuerdo con alguna de estas condiciones, te pedimos que no uses la aplicación.',
      },
      {
        body: 'El uso continuado de Tranquilo después de cualquier modificación a estos términos implica tu aceptación de los cambios.',
      },
    ],
  },
  {
    id: 'description',
    emoji: '📱',
    title: 'Qué es Tranquilo',
    items: [
      {
        body: 'Tranquilo es una aplicación de organización financiera personal que te permite registrar ingresos, gastos, presupuestos y hábitos de ahorro.',
      },
      {
        body: 'Tranquilo NO es un banco, una entidad financiera, una plataforma de inversión ni un asesor financiero. Es una herramienta de organización y seguimiento personal.',
      },
      {
        title: 'Lo que Tranquilo hace',
        bullets: [
          'registrar y categorizar tus ingresos y gastos',
          'organizar tu presupuesto en bolsillos personalizados',
          'mostrar tu historial financiero personal',
          'sincronizar tu información entre dispositivos cuando estás autenticado',
          'generar reportes simples para entender tus hábitos financieros',
        ],
      },
    ],
  },
  {
    id: 'account',
    emoji: '👤',
    title: 'Cuenta de usuario',
    items: [
      {
        body: 'Puedes usar Tranquilo sin crear una cuenta, pero tus datos solo se guardarán en el dispositivo que uses.',
      },
      {
        body: 'Al crear una cuenta eres responsable de mantener la confidencialidad de tus credenciales de acceso.',
      },
      {
        title: 'Comprometes que',
        bullets: [
          'la información que proporcionas al crear tu cuenta es veraz',
          'no cederás tu cuenta a terceros',
          'notificarás de inmediato cualquier uso no autorizado de tu cuenta',
          'eres mayor de 18 años o cuentas con autorización de un adulto responsable',
        ],
      },
      {
        body: 'Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    emoji: '🤝',
    title: 'Uso aceptable',
    items: [
      {
        body: 'Tranquilo está diseñado para uso personal y privado. Acuerdas usar la aplicación solo con fines legales y de acuerdo con estos términos.',
      },
      {
        title: 'Está prohibido',
        bullets: [
          'usar la aplicación para actividades ilegales o fraudulentas',
          'intentar acceder a datos de otros usuarios',
          'realizar ingeniería inversa o manipular el código de la aplicación',
          'usar la plataforma para registrar transacciones que encubran actividades ilícitas',
          'sobrecargar o interferir con la infraestructura del servicio',
        ],
      },
    ],
  },
  {
    id: 'data-accuracy',
    emoji: '📊',
    title: 'Exactitud de la información',
    items: [
      {
        body: 'Tranquilo muestra únicamente la información que tú introduces. No conecta con bancos, tarjetas de crédito ni otras entidades financieras para obtener datos automáticamente.',
      },
      {
        body: 'La exactitud del historial financiero, los cálculos y los reportes depende directamente de la información que registras. Eres responsable de la veracidad de los datos que introduces.',
      },
      {
        body: 'Los reportes y análisis que genera Tranquilo tienen fines informativos y no constituyen asesoría financiera profesional.',
      },
    ],
  },
  {
    id: 'intellectual-property',
    emoji: '🔏',
    title: 'Propiedad intelectual',
    items: [
      {
        body: 'Tranquilo, su diseño, logotipo, código fuente y todos los elementos visuales son propiedad de Cognia Technology. Todos los derechos reservados.',
      },
      {
        body: 'Los datos financieros que introduces en la aplicación son tuyos. Tranquilo no reivindica propiedad sobre tu información personal ni financiera.',
      },
      {
        body: 'No puedes copiar, reproducir, distribuir o modificar ningún componente de la aplicación sin autorización escrita.',
      },
    ],
  },
  {
    id: 'privacy',
    emoji: '🔒',
    title: 'Privacidad y datos personales',
    items: [
      {
        body: 'El manejo de tu información personal se rige por nuestra Política de Privacidad, que forma parte integral de estos Términos y Condiciones.',
      },
      {
        body: 'Al usar Tranquilo aceptas el tratamiento de datos descrito en nuestra Política de Privacidad.',
        link: { label: 'Ver Política de Privacidad →', href: '/privacy' },
      },
    ],
  },
  {
    id: 'liability',
    emoji: '⚠️',
    title: 'Limitación de responsabilidad',
    items: [
      {
        body: 'Tranquilo se ofrece "tal como está", sin garantías de ningún tipo, explícitas o implícitas.',
      },
      {
        title: 'Cognia Technology no se hace responsable por',
        bullets: [
          'pérdidas financieras derivadas de decisiones tomadas con base en los datos de la aplicación',
          'pérdida de datos por fallas técnicas, errores del usuario o problemas de conectividad',
          'interrupciones temporales del servicio por mantenimiento o causas externas',
          'daños indirectos, incidentales o consecuentes relacionados con el uso de la aplicación',
        ],
      },
      {
        body: 'Tranquilo es una herramienta de organización personal. Las decisiones financieras son responsabilidad exclusiva del usuario.',
      },
    ],
  },
  {
    id: 'availability',
    emoji: '🌐',
    title: 'Disponibilidad del servicio',
    items: [
      {
        body: 'Trabajamos para que Tranquilo esté disponible de forma continua, pero no garantizamos disponibilidad ininterrumpida del servicio.',
      },
      {
        body: 'Podemos realizar mantenimiento, actualizaciones o modificaciones que requieran interrupciones temporales. Intentaremos comunicarlas con anticipación cuando sea posible.',
      },
      {
        body: 'Los datos guardados localmente en tu dispositivo permanecen disponibles sin conexión a internet.',
      },
    ],
  },
  {
    id: 'changes',
    emoji: '🔄',
    title: 'Cambios al servicio y a los términos',
    items: [
      {
        body: 'Nos reservamos el derecho de modificar o discontinuar funcionalidades de Tranquilo en cualquier momento.',
      },
      {
        body: 'También podemos actualizar estos Términos y Condiciones para reflejar cambios en la aplicación, en la legislación aplicable o en nuestras prácticas.',
      },
      {
        body: 'Cuando los cambios sean significativos, intentaremos notificarlo dentro de la aplicación. La fecha de última actualización siempre aparecerá al inicio de este documento.',
      },
    ],
  },
  {
    id: 'termination',
    emoji: '🚪',
    title: 'Terminación del uso',
    items: [
      {
        body: 'Puedes dejar de usar Tranquilo en cualquier momento. Si tienes cuenta, puedes solicitar la eliminación de tu cuenta y los datos asociados.',
      },
      {
        body: 'Podemos suspender o eliminar tu cuenta si detectamos uso que infrinja estos términos, previo aviso cuando sea posible.',
      },
      {
        body: 'Al terminar el uso, los datos almacenados localmente en tu dispositivo permanecerán hasta que los elimines manualmente.',
      },
    ],
  },
  {
    id: 'law',
    emoji: '⚖️',
    title: 'Legislación aplicable',
    items: [
      {
        body: 'Estos Términos y Condiciones se rigen por las leyes de la República de Colombia.',
      },
      {
        body: 'Cualquier disputa relacionada con el uso de Tranquilo se resolverá preferentemente de manera amistosa. En caso contrario, se someterá a la jurisdicción de los tribunales competentes en Colombia.',
      },
    ],
  },
  {
    id: 'contact',
    emoji: '📬',
    title: 'Contacto',
    items: [
      {
        body: 'Si tienes preguntas sobre estos Términos y Condiciones, escríbenos a:',
        link: { label: 'cogniatech.1@gmail.com', href: 'mailto:cogniatech.1@gmail.com' },
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
                Sin letra chica. Aquí explicamos en lenguaje claro las condiciones de uso de
                Tranquilo.
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
                          margin: item.link ? '0 0 8px 0' : 0,
                          fontSize: '14px',
                          color: '#64748B',
                          lineHeight: 1.65,
                        }}
                      >
                        {item.body}
                      </p>
                    )}

                    {/* Enlace (ej: email de contacto, enlace cruzado) */}
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
              Ver Política de Privacidad →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
