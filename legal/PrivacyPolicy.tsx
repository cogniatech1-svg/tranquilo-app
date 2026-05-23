/**
 * legal/PrivacyPolicy.tsx
 *
 * Fuente única de verdad para la política de privacidad de Tranquilo.
 * Exporta:
 *   - openPrivacyPolicy()       → helper centralizado de navegación
 *   - PRIVACY_LAST_UPDATED      → fecha de última actualización
 *   - PRIVACY_SECTIONS          → contenido real de la política
 *   - PrivacyPolicyContent      → componente visual reutilizable
 */

// ── Helper de navegación centralizado ─────────────────────────────────────────

/**
 * Abre la política de privacidad completa en una nueva pestaña.
 * Centralizado aquí para facilitar cambios futuros (ej: modal, ruta interna, etc.)
 */
export function openPrivacyPolicy(): void {
  if (typeof window !== 'undefined') {
    window.open('/privacy', '_blank', 'noopener,noreferrer')
  }
}

// ── Tipos de contenido ─────────────────────────────────────────────────────────

export interface PrivacyItem {
  /** Título en negrita del ítem. Opcional — algunos ítems son solo cuerpo o bullets. */
  title?: string
  /** Párrafo de texto. */
  body?: string
  /** Lista de puntos. Puede combinarse con title. */
  bullets?: string[]
  /** Enlace opcional al final del ítem (ej: email de contacto). */
  link?: { label: string; href: string }
}

export interface PrivacySection {
  id: string
  emoji: string
  title: string
  items: PrivacyItem[]
}

// ── Fecha de actualización ─────────────────────────────────────────────────────

export const PRIVACY_LAST_UPDATED = 'Mayo de 2026'

// ── Contenido real de la política ─────────────────────────────────────────────

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'philosophy',
    emoji: '💚',
    title: 'Tus datos son tuyos',
    items: [
      {
        body: 'En Tranquilo creemos que tu información financiera es personal y debe permanecer bajo tu control. La aplicación existe para ayudarte a organizar tus ingresos, gastos, presupuestos y hábitos financieros de forma clara y tranquila, no para apropiarse de tu información.',
      },
      {
        title: 'Buscamos ser transparentes sobre',
        bullets: [
          'qué datos guardamos',
          'para qué los usamos',
          'cómo los protegemos',
          'qué control tienes sobre ellos',
        ],
      },
      {
        body: 'Tranquilo no es un banco, una entidad financiera ni una plataforma de inversión. Es una herramienta de organización financiera personal.',
      },
    ],
  },
  {
    id: 'what-we-collect',
    emoji: '📋',
    title: 'Qué información guardamos',
    items: [
      {
        title: 'Información de cuenta',
        bullets: [
          'nombre',
          'correo electrónico',
          'foto de perfil',
          'proveedor de autenticación (Google o correo electrónico)',
        ],
      },
      {
        title: 'Información financiera',
        bullets: [
          'ingresos',
          'gastos',
          'presupuestos o bolsillos',
          'categorías',
          'metas financieras',
          'notas o conceptos asociados a movimientos',
          'configuraciones y preferencias de uso',
        ],
      },
      {
        title: 'Información técnica básica',
        bullets: [
          'identificadores de sesión',
          'información básica del dispositivo',
          'registros técnicos necesarios para mantener el funcionamiento de la aplicación',
        ],
      },
    ],
  },
  {
    id: 'how-we-use',
    emoji: '🎯',
    title: 'Para qué usamos tu información',
    items: [
      {
        bullets: [
          'guardar tus datos financieros',
          'sincronizar tu información entre dispositivos cuando la sincronización está activa',
          'mostrarte tu historial y organización financiera',
          'mantener tu sesión iniciada',
          'mejorar estabilidad y funcionamiento de la aplicación',
          'proteger tu cuenta frente a accesos no autorizados',
          'ofrecer soporte técnico cuando sea necesario',
        ],
      },
      {
        body: 'No usamos tu información financiera para vender publicidad ni para tomar decisiones automatizadas sobre ti.',
      },
    ],
  },
  {
    id: 'what-we-dont-do',
    emoji: '🚫',
    title: 'Qué NO hacemos',
    items: [
      {
        bullets: [
          'no vendemos tu información financiera',
          'no compartimos tus movimientos personales con terceros para fines comerciales',
          'no utilizamos tus hábitos financieros para publicidad personalizada',
          'no publicamos ni exponemos tu información financiera a otros usuarios',
        ],
      },
      {
        body: 'Tu información financiera sigue siendo tuya.',
      },
    ],
  },
  {
    id: 'third-parties',
    emoji: '🔗',
    title: 'Servicios y proveedores externos',
    items: [
      {
        body: 'Para operar Tranquilo utilizamos servicios tecnológicos de terceros que ayudan con autenticación, almacenamiento y funcionamiento general de la plataforma.',
      },
      {
        title: 'Actualmente utilizamos',
        bullets: [
          'Supabase',
          'Google Authentication',
          'servicios de hosting e infraestructura tecnológica',
        ],
      },
      {
        body: 'Intentamos trabajar únicamente con proveedores que ofrezcan estándares razonables de seguridad y protección de datos.',
      },
    ],
  },
  {
    id: 'security',
    emoji: '🔐',
    title: 'Seguridad de la información',
    items: [
      {
        body: 'Tomamos medidas razonables para proteger tu información frente a accesos no autorizados, pérdida o uso indebido.',
      },
      {
        body: 'Sin embargo, ningún sistema digital puede garantizar seguridad absoluta.',
      },
      {
        title: 'También recomendamos',
        bullets: [
          'usar contraseñas seguras',
          'proteger tus dispositivos',
          'no compartir tu cuenta con otras personas',
        ],
      },
    ],
  },
  {
    id: 'your-control',
    emoji: '✅',
    title: 'Control sobre tu información',
    items: [
      {
        title: 'Actualmente puedes',
        bullets: [
          'modificar información dentro de la aplicación',
          'eliminar movimientos o registros individuales',
          'cerrar sesión y dejar de usar la plataforma cuando quieras',
        ],
      },
      {
        title: 'Próximamente disponible',
        bullets: [
          'exportación de datos',
          'eliminación completa de cuenta y datos asociados directamente desde la aplicación',
        ],
      },
    ],
  },
  {
    id: 'retention',
    emoji: '🗓️',
    title: 'Conservación de datos',
    items: [
      {
        body: 'Mientras uses Tranquilo, cierta información puede mantenerse almacenada para permitir el funcionamiento de la aplicación y la sincronización entre dispositivos.',
      },
      {
        body: 'Cuando se habiliten las herramientas de eliminación de cuenta, podrás solicitar la eliminación de la información asociada. Algunos respaldos temporales pueden persistir por períodos limitados antes de eliminarse definitivamente.',
      },
    ],
  },
  {
    id: 'legal',
    emoji: '⚖️',
    title: 'Legislación y protección de datos',
    items: [
      {
        body: 'Tranquilo busca cumplir los principios generales de protección de datos personales aplicables en Colombia, incluyendo lo relacionado con Habeas Data y la Ley 1581 de 2012.',
      },
      {
        body: 'Al utilizar la aplicación aceptas el tratamiento de datos descrito en esta política.',
      },
    ],
  },
  {
    id: 'changes',
    emoji: '🔄',
    title: 'Cambios a esta política',
    items: [
      {
        body: 'Podemos actualizar esta política para reflejar mejoras, cambios técnicos o ajustes legales. Cuando los cambios sean importantes, intentaremos comunicarlo dentro de la aplicación.',
      },
      {
        body: 'La fecha de actualización siempre aparecerá al inicio de este documento.',
      },
    ],
  },
  {
    id: 'contact',
    emoji: '📬',
    title: 'Contacto',
    items: [
      {
        body: 'Si tienes preguntas relacionadas con esta política o con el manejo de tu información, escríbenos a:',
        link: { label: 'cogniatech.1@gmail.com', href: 'mailto:cogniatech.1@gmail.com' },
      },
    ],
  },
  {
    id: 'summary',
    emoji: '💡',
    title: 'En resumen',
    items: [
      {
        bullets: [
          'tus datos financieros son tuyos',
          'Tranquilo existe para ayudarte a organizarlos',
          'no vendemos tu información',
          'buscamos manejar tus datos de forma clara y responsable',
          'y trabajamos para que tengas cada vez más control sobre tu información',
        ],
      },
    ],
  },
]

// ── Componente visual ──────────────────────────────────────────────────────────

interface PrivacyPolicyContentProps {
  /** Muestra encabezado completo (para /privacy). false = solo contenido embebido. */
  showHeader?: boolean
}

export function PrivacyPolicyContent({ showHeader = true }: PrivacyPolicyContentProps) {
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
                src="/logo-ui.png"
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
                Política de Privacidad
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
                Tu privacidad es parte del producto, no un requisito legal. Aquí explicamos en
                lenguaje claro cómo cuidamos tu información.
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
                Última actualización: {PRIVACY_LAST_UPDATED}
              </span>
            </div>
          </>
        )}

        {/* Secciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {PRIVACY_SECTIONS.map((section) => (
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
          </div>
        )}
      </div>
    </div>
  )
}
