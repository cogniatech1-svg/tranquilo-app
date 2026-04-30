'use client'

export default function SplashComparison() {
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
        Comparación del Splash Screen Nativo
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        width: '100%',
        maxWidth: '900px',
      }}>
        {/* ANTES */}
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
          }}>
            <img
              src="/logo-ui.png"
              alt="Tranquilo"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                marginBottom: '40px',
              }}
            />
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              opacity: 0.7,
            }}>
              Tranquilo
            </p>
          </div>
          <p style={{
            color: '#999',
            fontSize: '12px',
            marginTop: '16px',
            textAlign: 'center',
          }}>
            background_color: #0D6259
          </p>
        </div>

        {/* DESPUÉS */}
        <div>
          <h2 style={{
            color: '#fff',
            fontSize: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            opacity: 0.8,
          }}>
            DESPUÉS (Optimizado)
          </h2>
          <div style={{
            width: '100%',
            aspectRatio: '9/16',
            background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
            borderRadius: '16px',
            border: '3px solid #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <img
              src="/logo-ui.png"
              alt="Tranquilo"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                marginBottom: '40px',
              }}
            />
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              opacity: 0.7,
            }}>
              Tranquilo
            </p>
          </div>
          <p style={{
            color: '#999',
            fontSize: '12px',
            marginTop: '16px',
            textAlign: 'center',
          }}>
            background_color: #042F2E<br/>
            (matches gradient start)
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
          Cambios Propuestos:
        </h3>
        <ul style={{
          color: '#ccc',
          fontSize: '14px',
          lineHeight: '1.8',
          margin: 0,
          paddingLeft: '20px',
        }}>
          <li>
            <strong>manifest.json:</strong> background_color cambia de #0D6259 a #042F2E
          </li>
          <li>
            <strong>manifest.json:</strong> theme_color cambia de #0F766E a #0D6259
          </li>
          <li>
            <strong>layout.tsx:</strong> statusBarStyle cambia de 'black-translucent' a 'black'
          </li>
          <li style={{ marginTop: '12px', color: '#aaa' }}>
            Resultado: La transición entre el splash nativo y la app será más fluida y coherente
          </li>
        </ul>
      </div>

      <p style={{
        color: '#666',
        fontSize: '12px',
        marginTop: '40px',
        textAlign: 'center',
      }}>
        ¿Apruebas estos cambios? Responde sí para proceder con la modificación.
      </p>
    </div>
  )
}
