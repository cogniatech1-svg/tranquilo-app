'use client'

export default function SplashMinimalista() {
  return (
    <div style={{
      background: '#000',
      minHeight: '100vh',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '40px',
      paddingTop: '40px',
    }}>
      <h1 style={{
        color: '#fff',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px',
      }}>
        Splash Screen Nativo - Comparación
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        width: '100%',
        maxWidth: '900px',
      }}>
        {/* ANTES - Actual */}
        <div>
          <h2 style={{
            color: '#fff',
            fontSize: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            opacity: 0.8,
          }}>
            ANTES (Actual)
          </h2>
          <div style={{
            width: '100%',
            aspectRatio: '9/16',
            background: '#0D6259',
            borderRadius: '16px',
            border: '3px solid #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            gap: '20px',
          }}>
            {/* Marco blanco */}
            <div style={{
              width: '140px',
              height: '140px',
              background: 'white',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
            }}>
              <img
                src="/logo-ui.png"
                alt="Tranquilo"
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'contain',
                }}
              />
            </div>
            {/* Texto */}
            <p style={{
              color: '#fff',
              fontSize: '14px',
              textAlign: 'center',
              paddingX: '20px',
              lineHeight: '1.4',
            }}>
              Tranquilo — Finanzas Personales
            </p>
          </div>
          <p style={{
            color: '#999',
            fontSize: '12px',
            marginTop: '16px',
            textAlign: 'center',
          }}>
            Con marco blanco y texto
          </p>
        </div>

        {/* DESPUÉS - Minimalista */}
        <div>
          <h2 style={{
            color: '#fff',
            fontSize: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            opacity: 0.8,
          }}>
            DESPUÉS (Minimalista)
          </h2>
          <div style={{
            width: '100%',
            aspectRatio: '9/16',
            background: '#0D6259',
            borderRadius: '16px',
            border: '3px solid #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Solo logo, sin marco, sin texto */}
            <img
              src="/logo-ui.png"
              alt="Tranquilo"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
              }}
            />
          </div>
          <p style={{
            color: '#999',
            fontSize: '12px',
            marginTop: '16px',
            textAlign: 'center',
          }}>
            Solo logo, sin marco, sin texto
          </p>
        </div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '900px',
        marginTop: '40px',
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        borderLeft: '4px solid #0F766E',
      }}>
        <h3 style={{
          color: '#fff',
          fontSize: '14px',
          marginBottom: '12px',
          fontWeight: 'bold',
        }}>
          Lo que cambiaría:
        </h3>
        <ul style={{
          color: '#ccc',
          fontSize: '14px',
          lineHeight: '1.8',
          margin: 0,
          paddingLeft: '20px',
        }}>
          <li>✓ Marco blanco → Desaparece</li>
          <li>✓ Texto "Tranquilo — Finanzas Personales" → Desaparece</li>
          <li>✓ Solo el logo centrado en el fondo #0D6259</li>
          <li style={{ marginTop: '12px', color: '#aaa' }}>
            Color de fondo: Mantiene #0D6259 (igual al actual)
          </li>
        </ul>
      </div>

      <p style={{
        color: '#666',
        fontSize: '12px',
        marginTop: '40px',
        textAlign: 'center',
      }}>
        ¿Te gusta así? Si sí, procedo con los cambios.
      </p>
    </div>
  )
}
