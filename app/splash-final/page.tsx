'use client'

export default function SplashFinal() {
  return (
    <div style={{
      background: '#042F2E',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      margin: 0,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Logo solo, sin marco, sin texto */}
      <img
        src="/logo-ui.png"
        alt="Tranquilo"
        style={{
          width: '120px',
          height: '120px',
          objectFit: 'contain',
        }}
      />

      <style>{`
        * {
          margin: 0;
          padding: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
