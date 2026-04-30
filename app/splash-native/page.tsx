'use client'

export default function SplashNative() {
  return (
    <div style={{
      background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
    }}>
      {/* Logo solo */}
      <img
        src="/logo-ui.png"
        alt="Tranquilo"
        style={{
          width: '100px',
          height: '100px',
          objectFit: 'contain',
        }}
      />

      {/* Texto opcional */}
      <p style={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '12px',
        marginTop: '40px',
        opacity: 0.7,
      }}>
        Tranquilo
      </p>

      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
