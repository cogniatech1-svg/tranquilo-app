'use client'

import { useState } from 'react'

export default function ProfileInteractive() {
  const [selectedOption, setSelectedOption] = useState<1 | 3>(1)
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
        { label: 'Acción', value: 'Cambiar foto', type: 'button' },
        { label: 'Acción', value: 'Eliminar foto', type: 'button-danger' },
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
        { label: 'Exportar datos', value: 'Descargar archivo', type: 'button' },
        { label: 'Historial de transacciones', value: 'Ver historial', type: 'button' },
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

  // OPCIÓN 1: MINIMALISTA INTERACTIVA
  if (selectedOption === 1) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setSelectedOption(1)} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
              cursor: 'pointer', background: '#0d6259', color: 'white'
            }}>
              Opción 1
            </button>
            <button onClick={() => { setSelectedOption(3); setExpandedSection(null); }} style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
              cursor: 'pointer', background: '#e2e8f0', color: '#000'
            }}>
              Opción 3
            </button>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Opción 1: Minimalista Interactiva</h2>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0d6259 0%, #0891b2 100%)',
              padding: '25px 20px',
              color: 'white',
              textAlign: 'center',
            }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: '#10B981', margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
              }}>
                👤
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>Juan Pérez</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>juan@example.com</p>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              {sectionList.map((section) => (
                <div key={section.key}>
                  <div
                    onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px 0',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px' }}>{section.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                        {section.title}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '16px', color: '#6b7280',
                      transition: 'transform 0.2s',
                      transform: expandedSection === section.key ? 'rotate(90deg)' : 'rotate(0deg)'
                    }}>
                      ▶
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {expandedSection === section.key && (
                    <div style={{ padding: '15px 0', background: '#f9fafb', marginBottom: '15px', borderRadius: '8px', paddingLeft: '15px', paddingRight: '15px' }}>
                      {section.content.map((item, i) => (
                        <div key={i} style={{ marginBottom: i < section.content.length - 1 ? '12px' : 0, paddingBottom: '12px', borderBottom: i < section.content.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                            {item.label}
                          </div>
                          {item.type === 'image' ? (
                            <div style={{ width: '50px', height: '50px', background: '#ddd', borderRadius: '8px', marginTop: '8px' }}></div>
                          ) : item.type === 'button' || item.type === 'button-danger' ? (
                            <button style={{
                              width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none',
                              background: item.type === 'button-danger' ? '#ef4444' : '#0d6259',
                              color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                            }}>
                              {item.value}
                            </button>
                          ) : item.type === 'toggle' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                              <span style={{ fontSize: '13px', color: '#4b5563' }}>{item.value}</span>
                            </div>
                          ) : item.type === 'select' ? (
                            <select style={{
                              width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db',
                              fontSize: '13px', background: 'white'
                            }}>
                              <option>{item.value}</option>
                            </select>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: item.type === 'password' ? 500 : 400 }}>
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

            <div style={{ padding: '15px 20px', background: '#f9fafb', textAlign: 'center' }}>
              <button style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer'
              }}>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // OPCIÓN 3: MODERNA INTERACTIVA
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => { setSelectedOption(1); setExpandedSection(null); }} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
            cursor: 'pointer', background: '#e2e8f0', color: '#000'
          }}>
            Opción 1
          </button>
          <button onClick={() => setSelectedOption(3)} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
            cursor: 'pointer', background: '#0d6259', color: 'white'
          }}>
            Opción 3
          </button>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Opción 3: Moderna Interactiva</h2>

        <div style={{
          background: 'white',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {/* Header */}
          <div style={{
            background: '#0d6259',
            padding: '40px 20px',
            color: 'white',
            textAlign: 'center',
          }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', border: '4px solid rgba(255,255,255,0.2)',
            }}>
              👤
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>Juan Pérez</h3>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>Miembro desde 2024</p>
          </div>

          {/* Cards */}
          <div style={{ padding: '25px 20px' }}>
            {sectionList.map((section, idx) => {
              const colors = ['#0d6259', '#0891b2', '#059669', '#d97706', '#7c3aed', '#ec4899']
              const color = colors[idx % colors.length]

              return (
                <div key={section.key}>
                  <div
                    onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                    style={{
                      marginBottom: '15px',
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${color}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <div style={{ fontSize: '24px', marginTop: '2px' }}>{section.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '2px'
                      }}>
                        {section.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Haz clic para expandir
                      </div>
                    </div>
                    <div style={{
                      fontSize: '16px', opacity: 0.4,
                      transition: 'transform 0.2s',
                      transform: expandedSection === section.key ? 'rotate(90deg)' : 'rotate(0deg)'
                    }}>
                      ▶
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedSection === section.key && (
                    <div style={{
                      marginBottom: '15px', padding: '16px', background: '#f9fafb',
                      borderRadius: '12px', marginLeft: '5px', borderLeft: `3px solid ${color}`
                    }}>
                      {section.content.map((item, i) => (
                        <div key={i} style={{
                          marginBottom: i < section.content.length - 1 ? '12px' : 0,
                          paddingBottom: i < section.content.length - 1 ? '12px' : 0,
                          borderBottom: i < section.content.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          <div style={{
                            fontSize: '11px', fontWeight: 700, color: '#6b7280',
                            marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            {item.label}
                          </div>
                          {item.type === 'image' ? (
                            <div style={{
                              width: '60px', height: '60px', background: '#ddd',
                              borderRadius: '8px'
                            }}></div>
                          ) : item.type === 'button' || item.type === 'button-danger' ? (
                            <button style={{
                              width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none',
                              background: item.type === 'button-danger' ? '#ef4444' : color,
                              color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                            }}>
                              {item.value}
                            </button>
                          ) : item.type === 'toggle' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                              <span style={{ fontSize: '13px', color: '#4b5563' }}>{item.value}</span>
                            </div>
                          ) : item.type === 'select' ? (
                            <select style={{
                              width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db',
                              fontSize: '13px', background: 'white'
                            }}>
                              <option>{item.value}</option>
                            </select>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#4b5563' }}>
                              {item.value}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <button style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer'
            }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
