'use client'

export default function SplashSpinner() {
  return (
    <div style={{
      background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,232,249,.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
      }}>

        {/* Logo */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '56px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          🌿
        </div>

        {/* Spinner */}
        <div style={{
          position: 'relative',
          width: '50px',
          height: '50px',
        }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'rgba(255,255,255,0.8)',
            borderRightColor: 'rgba(255,255,255,0.6)',
            animation: 'spin 1s linear infinite',
          }} />

          {/* Inner ring */}
          <div style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)',
            borderBottomColor: 'rgba(16, 185, 129, 0.8)',
            animation: 'spin-reverse 2s linear infinite',
          }} />

          {/* Center dot */}
          <div style={{
            position: 'absolute',
            inset: '50%',
            width: '6px',
            height: '6px',
            marginTop: '-3px',
            marginLeft: '-3px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
          }} />
        </div>

        {/* Text */}
        <div style={{
          textAlign: 'center',
          color: 'white',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            margin: 0,
            marginBottom: '8px',
          }}>
            Tranquilo
          </h1>
          <p style={{
            fontSize: '13px',
            opacity: 0.7,
            margin: 0,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Cargando...
          </p>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </div>
  )
}
