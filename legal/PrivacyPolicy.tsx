/**
 * legal/PrivacyPolicy.tsx
 *
 * Fuente única de verdad para la política de privacidad de Tranquilo.
 * Exporta:
 *   - openPrivacyPolicy()       → helper centralizado de navegación
 *   - PRIVACY_SECTIONS          → datos crudos de la política
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

// ── Contenido de la política ───────────────────────────────────────────────────

export interface PrivacyItem {
  title: string
  body: string
}

export interface PrivacySection {
  id: string
  emoji: string
  title: string
  items: PrivacyItem[]
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'what-we-collect',
    emoji: '📋',
    title: 'Qué información guardamos',
    items: [
      {
        title: 'Datos de cuenta',
        body: 'Tu dirección de correo electrónico y contraseña cifrada, necesarios para crear y proteger tu cuenta.',
      },
      {
        title: 'Información financiera',
        body: 'Los ingresos, gastos y presupuestos que tú ingresas manualmente. Tranquilo no accede a tus cuentas bancarias ni tarjetas.',
      },
      {
        title: 'Configuración personal',
        body: 'Nombre, foto de perfil y preferencias de la app. Siempre puedes modificarlos o eliminarlos.',
      },
    ],
  },
  {
    id: 'how-we-use',
    emoji: '🎯',
    title: 'Para qué usamos tu información',
    items: [
      {
        title: 'Mostrarte tus finanzas',
        body: 'Tu información se usa exclusivamente para calcular y mostrar tus reportes, presupuestos e insights dentro de la app.',
      },
      {
        title: 'Mejorar Tranquilo',
        body: 'Usamos datos de uso anónimos y agregados para entender qué funciones son más útiles y mejorar la experiencia.',
      },
      {
        title: 'Nada más',
        body: 'No usamos tus datos financieros para publicidad, perfilado comercial ni ningún propósito ajeno a la app.',
      },
    ],
  },
  {
    id: 'storage',
    emoji: '🔐',
    title: 'Almacenamiento y seguridad',
    items: [
      {
        title: 'Infraestructura certificada',
        body: 'Tus datos se almacenan en Supabase, proveedor con certificaciones SOC 2 y cifrado en reposo y en tránsito.',
      },
      {
        title: 'Acceso local offline',
        body: 'Para que la app funcione sin conexión, algunos datos se guardan localmente en tu dispositivo (localStorage). Solo tú tienes acceso.',
      },
      {
        title: 'Contraseñas',
        body: 'Las contraseñas nunca se almacenan en texto plano. Usamos el sistema de autenticación segura de Supabase Auth.',
      },
    ],
  },
  {
    id: 'sharing',
    emoji: '🚫',
    title: 'Compartición de datos',
    items: [
      {
        title: 'No vendemos tu información',
        body: 'Tranquilo no vende, alquila ni intercambia tus datos personales con ningún tercero.',
      },
      {
        title: 'No hay anunciantes',
        body: 'No compartimos tu información con redes publicitarias ni plataformas de seguimiento.',
      },
      {
        title: 'Proveedores de servicio',
        body: 'Solo compartimos datos con proveedores técnicos estrictamente necesarios (como Supabase) bajo acuerdos de confidencialidad.',
      },
    ],
  },
  {
    id: 'your-rights',
    emoji: '✅',
    title: 'Tus derechos',
    items: [
      {
        title: 'Acceso y portabilidad',
        body: 'Puedes exportar todos tus datos financieros en cualquier momento desde la sección Perfil → Mis Datos.',
      },
      {
        title: 'Corrección',
        body: 'Puedes modificar tu información personal en cualquier momento desde tu perfil.',
      },
      {
        title: 'Eliminación',
        body: 'Puedes solicitar la eliminación completa de tu cuenta y todos tus datos. Esta opción estará disponible próximamente en Perfil.',
      },
    ],
  },
  {
    id: 'contact',
    emoji: '📬',
    title: 'Contacto',
    items: [
      {
        title: 'Ejercer tus derechos',
        body: 'Para cualquier consulta sobre tus datos o para ejercer tus derechos, escríbenos a privacidad@tranquilo.app',
      },
      {
        title: 'Actualizaciones',
        body: 'Si realizamos cambios importantes a esta política, te notificaremos dentro de la app. La versión vigente siempre estará disponible en esta página.',
      },
    ],
  },
]

// ── Componente visual ──────────────────────────────────────────────────────────

interface PrivacyPolicyContentProps {
  /** Controla si se muestra el encabezado completo (para página /privacy) o solo el contenido (para uso embebido) */
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
            {/* Logotipo / marca */}
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

            {/* Encabezado principal */}
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
                Última actualización: mayo 2025
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
                {section.items.map((item) => (
                  <div key={item.title} style={{ paddingLeft: '32px' }}>
                    <p
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1E293B',
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#64748B',
                        lineHeight: 1.65,
                      }}
                    >
                      {item.body}
                    </p>
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
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              privacidad@tranquilo.app
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
