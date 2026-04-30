'use client'

export default function PreviewOption3() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER MEJORADO (OPCIÓN 3) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          padding: '30px 20px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Avatar + Nombre */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '25px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              border: '3px solid rgba(255,255,255,0.3)',
            }}>
              👤
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '2px' }}>Tu nombre aquí</h2>
              <p style={{ fontSize: '13px', opacity: 0.9 }}>Tranquilo Premium</p>
            </div>
          </div>

          {/* Logro/Nivel */}
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            ⭐ Experto en Finanzas
          </div>

          {/* Indicador de Salud */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.1)',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            backdropFilter: 'blur(5px)',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
            }} />
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Tu salud financiera es excelente</div>
          </div>

          {/* Resumen Rápido - 4 Métricas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '15px',
          }}>
            {[
              { label: 'Gastado', value: '$8.5M' },
              { label: 'Presupuesto', value: '$10M' },
              { label: 'Disponible', value: '$1.5M' },
              { label: 'Ahorro', value: '25%' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div style={{ fontSize: '11px', opacity: 0.85, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Mes y Año */}
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            opacity: 0.9,
            marginTop: '15px',
          }}>
            Abril de 2026
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTENT - TODO EL CONTENIDO ACTUAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '30px 20px' }}>

          {/* 1. USUARIO */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
              opacity: 0.6,
              borderLeft: '3px solid #0d6259',
              paddingLeft: '12px',
            }}>
              Usuario
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Plan</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Acceso completo</div>
                </div>
                <span style={{ background: '#ccf0eb', color: '#0d6259', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                  Premium
                </span>
              </div>
              <button style={{
                width: '100%',
                padding: '10px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
              }}>
                Ver planes
              </button>
            </div>
          </div>

          {/* 2. SEGURIDAD */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
              opacity: 0.6,
              borderLeft: '3px solid #0d6259',
              paddingLeft: '12px',
            }}>
              Seguridad
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>PIN de acceso</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Protege tu app</div>
                </div>
                <div style={{
                  width: '44px',
                  height: '24px',
                  background: '#e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }} />
              </div>
            </div>
          </div>

          {/* 3. DATOS */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
              opacity: 0.6,
              borderLeft: '3px solid #0d6259',
              paddingLeft: '12px',
            }}>
              Datos
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 0',
            }}>
              {[
                { emoji: '📥', title: 'Exportar datos (CSV)' },
                { emoji: '📤', title: 'Importar datos (CSV)' },
                { emoji: '🗑️', title: 'Borrar todos los datos', color: '#dc2626' },
              ].map((item, i) => (
                <button
                  key={i}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: i < 2 ? '1px solid #e2e8f0' : 'none',
                    color: item.color || '#0f172a',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: '14px', opacity: 0.3 }}>›</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. PREFERENCIAS */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
              opacity: 0.6,
              borderLeft: '3px solid #0d6259',
              paddingLeft: '12px',
            }}>
              Preferencias
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {[
                { title: 'Tema oscuro', subtitle: 'Cambia el aspecto de la app' },
                { title: 'Ocultar montos', subtitle: 'Privacidad en tu pantalla' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i === 0 ? '16px' : '0', borderBottom: i === 0 ? '1px solid #e2e8f0' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{item.subtitle}</div>
                  </div>
                  <div style={{
                    width: '44px',
                    height: '24px',
                    background: '#e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* 5. SOPORTE */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
              opacity: 0.6,
              borderLeft: '3px solid #0d6259',
              paddingLeft: '12px',
            }}>
              Soporte
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <button style={{
                width: '100%',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>💬</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Enviar feedback</span>
                </div>
                <span style={{ fontSize: '14px', opacity: 0.3 }}>›</span>
              </button>
            </div>
          </div>


          {/* 7. VERSIÓN */}
          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tranquilo v1.0.0</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>© 2026 Tranquilo</p>
          </div>

        </div>
      </div>
    </div>
  )
}
