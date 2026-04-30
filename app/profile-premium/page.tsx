'use client'

import { useState } from 'react'

export default function ProfilePremium() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sections = {
    perfil: {
      title: 'Mi Perfil',
      icon: '👤',
      content: [
        { label: 'Nombre', value: 'Juan Pérez', editable: true },
        { label: 'Email', value: 'juan@example.com', editable: true },
        { label: 'Teléfono', value: '+57 300 123 4567', editable: true },
        { label: 'País', value: 'Colombia', editable: true },
      ]
    },
    foto: {
      title: 'Foto de Perfil',
      icon: '📸',
      content: [
        { label: 'Foto actual', value: 'avatar.jpg', type: 'image' },
        { label: 'Cambiar', value: 'Subir nueva foto', type: 'button' },
        { label: 'Eliminar', value: 'Remover foto', type: 'button-danger' },
      ]
    },
    seguridad: {
      title: 'Seguridad',
      icon: '🔐',
      content: [
        { label: 'Contraseña', value: '•••••••••', type: 'password' },
        { label: 'Autenticación 2FA', value: 'Activada', type: 'toggle' },
        { label: 'Dispositivos activos', value: '2 dispositivos', type: 'info' },
        { label: 'Última actividad', value: 'Hace 5 minutos', type: 'info' },
      ]
    },
    datos: {
      title: 'Mis Datos',
      icon: '📊',
      content: [
        { label: 'Exportar datos', value: 'Descargar CSV', type: 'button' },
        { label: 'Historial', value: 'Ver transacciones', type: 'button' },
        { label: 'Borrar todo', value: 'Eliminar datos', type: 'button-danger' },
      ]
    },
    preferencias: {
      title: 'Preferencias',
      icon: '⚙️',
      content: [
        { label: 'Notificaciones', value: 'Activadas', type: 'toggle' },
        { label: 'Tema', value: 'Automático', type: 'select' },
        { label: 'Idioma', value: 'Español', type: 'select' },
        { label: 'Moneda', value: 'COP', type: 'select' },
      ]
    },
  }

  const sectionList = Object.entries(sections).map(([key, val]) => ({
    key,
    ...val
  }))

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER PREMIUM - Gradiente elegante */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          padding: '40px 20px 35px',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Avatar grande y elegante */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            border: '3px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
          }}>
            👤
          </div>

          {/* Nombre y subtitle */}
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}>
            Juan Pérez
          </h1>
          <p style={{
            margin: 0,
            fontSize: '13px',
            opacity: 0.85,
            fontWeight: 500,
          }}>
            juan@example.com
          </p>

          {/* Divider sutil */}
          <div style={{
            height: '1px',
            background: 'rgba(255,255,255,0.15)',
            margin: '20px 0',
          }} />

          {/* Info resumida */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '12px',
          }}>
            <div>
              <div style={{ opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                Miembro desde
              </div>
              <div style={{ fontWeight: 600 }}>2024</div>
            </div>
            <div style={{
              width: '1px',
              background: 'rgba(255,255,255,0.15)',
            }} />
            <div>
              <div style={{ opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                Cuenta
              </div>
              <div style={{ fontWeight: 600 }}>Verificada ✓</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECCIONES - Cards sutiles y profesionales */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '30px 20px',
        }}>
          {sectionList.map((section, idx) => (
            <div key={section.key} style={{ marginBottom: '16px' }}>
              {/* Card Container */}
              <div
                onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #0d6259';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 98, 89, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid #e5e7eb';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon */}
                <div style={{
                  fontSize: '24px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(13, 98, 89, 0.08)',
                  borderRadius: '10px',
                }}>
                  {section.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: '2px',
                  }}>
                    {section.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                  }}>
                    {expandedSection === section.key ? 'Haz clic para contraer' : 'Haz clic para expandir'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '16px',
                  color: '#0d6259',
                  transition: 'transform 0.2s',
                  transform: expandedSection === section.key ? 'rotate(90deg)' : 'rotate(0deg)',
                  fontWeight: 'bold',
                }}>
                  ▶
                </div>
              </div>

              {/* Expanded Content */}
              {expandedSection === section.key && (
                <div style={{
                  marginTop: '12px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  padding: '20px',
                  animation: 'fadeIn 0.2s ease',
                }}>
                  {section.content.map((item, i) => (
                    <div key={i} style={{
                      marginBottom: i < section.content.length - 1 ? '16px' : 0,
                      paddingBottom: i < section.content.length - 1 ? '16px' : 0,
                      borderBottom: i < section.content.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <label style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'block',
                        marginBottom: '6px',
                      }}>
                        {item.label}
                      </label>

                      {item.type === 'image' ? (
                        <div style={{
                          width: '70px',
                          height: '70px',
                          background: '#f3f4f6',
                          borderRadius: '10px',
                          border: '2px dashed #d1d5db',
                        }} />
                      ) : item.type === 'button' || item.type === 'button-danger' ? (
                        <button style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: item.type === 'button-danger' ? '#ef4444' : '#0d6259',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                          {item.value}
                        </button>
                      ) : item.type === 'toggle' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="checkbox" defaultChecked style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0d6259',
                          }} />
                          <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
                            {item.value}
                          </span>
                        </div>
                      ) : item.type === 'select' ? (
                        <select style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '13px',
                          background: 'white',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}>
                          <option>{item.value}</option>
                        </select>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#374151', fontWeight: item.type === 'password' ? 600 : 500 }}>
                          {item.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '20px',
          textAlign: 'center',
        }}>
          <button style={{
            width: '100%',
            maxWidth: '380px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: '#ef4444',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
          }}>
            Cerrar Sesión
          </button>
          <p style={{
            fontSize: '11px',
            color: '#9ca3af',
            margin: '10px 0 0 0',
          }}>
            Versión 1.0.0 • © 2026 Tranquilo
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
