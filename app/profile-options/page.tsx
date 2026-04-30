'use client'

import { useState } from 'react'

export default function ProfileOptions() {
  const [selectedOption, setSelectedOption] = useState(1)

  return (
    <div style={{
      background: '#f8fafc',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Selector de Opciones */}
      <div style={{
        maxWidth: '400px',
        margin: '0 auto 30px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
      }}>
        {[1, 2, 3].map((opt) => (
          <button
            key={opt}
            onClick={() => setSelectedOption(opt)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              background: selectedOption === opt ? '#0d6259' : '#e2e8f0',
              color: selectedOption === opt ? 'white' : '#000',
              transition: 'all 0.2s',
            }}
          >
            Opción {opt}
          </button>
        ))}
      </div>

      {/* OPCIÓN 1: MINIMALISTA */}
      {selectedOption === 1 && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
            Opción 1: Minimalista
          </h2>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Header Simple */}
            <div style={{
              background: 'linear-gradient(135deg, #0d6259 0%, #0891b2 100%)',
              padding: '25px 20px',
              color: 'white',
              textAlign: 'center',
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#10B981',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}>
                👤
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>
                Juan Pérez
              </h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                juan@example.com
              </p>
            </div>

            {/* Content Simple */}
            <div style={{ padding: '20px' }}>
              {[
                { icon: '👤', label: 'Perfil', value: 'Editar' },
                { icon: '🔐', label: 'Seguridad', value: 'Cambiar' },
                { icon: '📊', label: 'Datos', value: 'Ver' },
                { icon: '⚙️', label: 'Preferencias', value: 'Ajustar' },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 0',
                    borderBottom: i < 3 ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    {item.value} →
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: '15px 20px', background: '#f9fafb', textAlign: 'center' }}>
              <button style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPCIÓN 2: COMPLETA (Option 3 Original) */}
      {selectedOption === 2 && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
            Opción 2: Completa (con Métricas)
          </h2>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Header Mejorado */}
            <div style={{
              background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
              padding: '30px 20px',
              color: 'white',
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
                  <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 2px 0' }}>
                    Juan Pérez
                  </h2>
                  <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
                    Tranquilo Premium
                  </p>
                </div>
              </div>

              {/* Logro */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.15)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                ⭐ Experto en Finanzas
              </div>

              {/* Health Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255,255,255,0.1)',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  Salud financiera excelente
                </div>
              </div>

              {/* 4 Métricas */}
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
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.85,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '30px 20px' }}>
              {[
                { section: 'Usuario', items: ['Perfil', 'Foto'] },
                { section: 'Seguridad', items: ['Contraseña', 'Dos Factores'] },
                { section: 'Datos', items: ['Exportar', 'Descargar'] },
              ].map((sec, idx) => (
                <div key={idx} style={{ marginBottom: '25px' }}>
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
                    {sec.section}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sec.items.map((item, i) => (
                      <div key={i} style={{
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OPCIÓN 3: MODERNA (Cards) */}
      {selectedOption === 3 && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
            Opción 3: Moderna (Cards Design)
          </h2>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Flat Header */}
            <div style={{
              background: '#0d6259',
              padding: '40px 20px',
              color: 'white',
              textAlign: 'center',
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                border: '4px solid rgba(255,255,255,0.2)',
              }}>
                👤
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>
                Juan Pérez
              </h3>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>
                Miembro desde 2024
              </p>
            </div>

            {/* Cards Grid */}
            <div style={{ padding: '25px 20px' }}>
              {[
                { icon: '👤', title: 'Mi Perfil', desc: 'Editar nombre y datos', color: '#0d6259' },
                { icon: '📸', title: 'Foto de Perfil', desc: 'Cambiar tu avatar', color: '#0891b2' },
                { icon: '🔐', title: 'Seguridad', desc: 'Contraseña y acceso', color: '#059669' },
                { icon: '⚙️', title: 'Preferencias', desc: 'Notificaciones y temas', color: '#d97706' },
                { icon: '📊', title: 'Mis Datos', desc: 'Exportar e historial', color: '#7c3aed' },
                { icon: '❓', title: 'Ayuda', desc: 'Soporte y contacto', color: '#ec4899' },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '15px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${card.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                >
                  <div style={{ fontSize: '24px', marginTop: '2px' }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {card.desc}
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', opacity: 0.4 }}>→</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: '12px',
              color: '#6b7280',
            }}>
              <button style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '10px',
              }}>
                Cerrar Sesión
              </button>
              <p style={{ margin: '10px 0 0 0' }}>v1.0.0 | © 2026 Tranquilo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
