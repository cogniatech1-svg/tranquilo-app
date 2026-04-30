'use client'

export default function SplashSkeleton() {
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

      {/* Logo */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '40px',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden',
      }}>
        <img
          src="/logo-ui.png"
          alt="Tranquilo"
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Skeleton loaders */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Header skeleton */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          {/* Avatar + Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              animation: 'pulse 2s infinite',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '16px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                marginBottom: '8px',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                width: '70%',
                animation: 'pulse 2s infinite',
              }} />
            </div>
          </div>

          {/* Badge skeleton */}
          <div style={{
            height: '28px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            width: '140px',
            marginBottom: '16px',
            animation: 'pulse 2s infinite',
          }} />

          {/* Health indicator skeleton */}
          <div style={{
            height: '40px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            marginBottom: '16px',
            animation: 'pulse 2s infinite',
          }} />

          {/* 4 Metrics skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: '70px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  animation: `pulse 2s infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        {[1, 2, 3].map((section) => (
          <div key={section} style={{ marginBottom: '20px' }}>
            {/* Section header */}
            <div style={{
              height: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              width: '100px',
              marginBottom: '12px',
              animation: 'pulse 2s infinite',
            }} />

            {/* Card skeleton */}
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{
                height: '14px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '6px',
                width: '60%',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                width: '80%',
                animation: 'pulse 2s infinite',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Loading text */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '12px',
        textAlign: 'center',
      }}>
        <p>Tranquilo</p>
        <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>Cargando...</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </div>
  )
}
