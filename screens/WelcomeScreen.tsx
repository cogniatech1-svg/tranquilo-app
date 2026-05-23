'use client'

import { useState, useEffect } from 'react'
import { signUp, logIn, signInWithGoogle } from '../lib/auth'
import { openPrivacyPolicy } from '../legal/PrivacyPolicy'

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME SCREEN
// Responsabilidad: UI de onboarding y autenticación.
// NO gestiona auth state, NO toca persistencia, NO maneja navegación.
// La navegación post-auth la maneja onAuthStateChanged en page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  /** Noop en page.tsx — la navegación real la maneja el auth listener */
  onLoginSuccess: () => void
  /** Llama handleGuestMode en page.tsx — sin cambios de comportamiento */
  onGuestMode: () => void
}

type Step = 'welcome' | 'value' | 'auth'
type AuthMode = 'signup' | 'login'

const VALUE_PROPS = [
  {
    icon: '🔒',
    title: 'Tus datos, protegidos',
    desc: 'Solo tú accedes a tu información financiera',
  },
  {
    icon: '📊',
    title: 'Claridad real',
    desc: 'Entiende a dónde va tu dinero cada mes',
  },
  {
    icon: '💚',
    title: 'Tranquilidad duradera',
    desc: 'Sin sorpresas, sin estrés a fin de mes',
  },
]

// Estilo base para inputs sobre fondo oscuro
const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1.5px solid rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.13)',
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s, background 0.2s',
}

export function WelcomeScreen({ onLoginSuccess, onGuestMode }: WelcomeScreenProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)

  // Bloquear scroll del body cuando el sheet está abierto
  useEffect(() => {
    if (privacyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [privacyModalOpen])

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setPassword2('')
    setError('')
    setConsentAccepted(false)
  }

  const handleSubmit = async () => {
    setError('')

    if (!email || !password) {
      setError('Completa email y contraseña')
      return
    }
    if (!validateEmail(email)) {
      setError('Email inválido')
      return
    }
    if (authMode === 'signup') {
      if (!consentAccepted) {
        setError('Debes aceptar la política de privacidad para continuar')
        return
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        return
      }
      if (password !== password2) {
        setError('Las contraseñas no coinciden')
        return
      }
    }

    setLoading(true)
    try {
      if (authMode === 'signup') {
        await signUp(email, password)
      } else {
        await logIn(email, password)
      }
      // onLoginSuccess es un noop — la navegación la maneja onAuthStateChanged
      onLoginSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('already registered')) {
        setError('Este email ya está registrado')
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos')
      } else if (msg.includes('password')) {
        setError('Contraseña muy débil (mínimo 6 caracteres)')
      } else {
        setError(`Error: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      // OAuth redirige — no se llama onLoginSuccess aquí
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error con Google: ${msg}`)
      setLoading(false)
    }
  }

  const goToAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    clearForm()
    setStep('auth')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #051C1B 0%, #0A5C57 58%, #0A72A0 100%)',
        fontFamily: 'system-ui',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs — mismo patrón que OnboardingScreen */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '288px',
          height: '288px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          transform: 'translate(33%, -33%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '256px',
          height: '256px',
          borderRadius: '50%',
          background: 'rgba(103,232,249,0.06)',
          transform: 'translate(-33%, 33%)',
          pointerEvents: 'none',
        }}
      />

      {/* Estilos globales: inputs y animación del sheet */}
      <style>{`
        .welcome-input::placeholder { color: rgba(255,255,255,0.4); }
        .welcome-input:focus { border-color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.20) !important; }
        .welcome-input:-webkit-autofill,
        .welcome-input:-webkit-autofill:hover,
        .welcome-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(10,92,87,0.90) inset;
          -webkit-text-fill-color: white;
          border-color: rgba(255,255,255,0.35) !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PASO 1: BIENVENIDA EMOCIONAL                                        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '24px',
                border: '1.5px solid rgba(255,255,255,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.20)',
                overflow: 'hidden',
              }}
            >
              <img
                src="/icons/logo-tranquilo.png"
                alt="Tranquilo"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                onError={(e) => {
                  // Fallback si la imagen no carga
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>

            <h1
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 14px 0',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 12px rgba(0,0,0,0.30)',
                lineHeight: 1.1,
              }}
            >
              Tranquilo
            </h1>

            <p
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.80)',
                margin: '0 0 10px 0',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              Tu espacio financiero,
              <br />
              en paz.
            </p>

            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.50)',
                margin: '0 0 52px 0',
                lineHeight: 1.6,
              }}
            >
              Registra, protege y entiende
              <br />
              tus finanzas personales.
            </p>

            <button
              onClick={() => setStep('value')}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'white',
                color: '#0A5C57',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Empezar →
            </button>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PASO 2: VALOR Y CONFIANZA                                           */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 'value' && (
          <>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 8px 0',
                letterSpacing: '-0.3px',
              }}
            >
              Lo que vas a lograr
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.50)',
                margin: '0 0 36px 0',
              }}
            >
              Simple, seguro y solo tuyo.
            </p>

            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '40px',
              }}
            >
              {VALUE_PROPS.map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <span style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1.3 }}>
                    {item.icon}
                  </span>
                  <div>
                    <p
                      style={{
                        margin: '0 0 4px 0',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: 'rgba(255,255,255,0.50)',
                        fontSize: '12px',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <button
                onClick={() => goToAuth('signup')}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'white',
                  color: '#0A5C57',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Crear mi cuenta →
              </button>

              <button
                onClick={() => goToAuth('login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.60)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '10px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
              >
                Ya tengo cuenta
              </button>
            </div>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PASO 3: AUTENTICACIÓN                                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <>
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 6px 0',
                letterSpacing: '-0.3px',
              }}
            >
              {authMode === 'signup' ? 'Crea tu espacio' : 'Bienvenido de vuelta'}
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.50)',
                margin: '0 0 28px 0',
                lineHeight: 1.5,
              }}
            >
              {authMode === 'signup'
                ? 'Tu historial financiero, guardado y seguro'
                : 'Ingresa para ver tus finanzas'}
            </p>

            {/* Toggle Crear / Ingresar */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '24px',
                gap: '4px',
              }}
            >
              {(['signup', 'login'] as AuthMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode)
                    setError('')
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: authMode === mode ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: authMode === mode ? 'white' : 'rgba(255,255,255,0.45)',
                    fontSize: '13px',
                    fontWeight: authMode === mode ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}
                </button>
              ))}
            </div>

            {/* Campos del formulario */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: error ? '12px' : '20px',
              }}
            >
              <input
                className="welcome-input"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                style={baseInputStyle}
              />
              <input
                className="welcome-input"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                style={baseInputStyle}
              />
              {authMode === 'signup' && (
                <input
                  className="welcome-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmar contraseña"
                  value={password2}
                  onChange={(e) => {
                    setPassword2(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  disabled={loading}
                  style={baseInputStyle}
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.18)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#fca5a5',
                  fontSize: '12px',
                  marginBottom: '16px',
                  textAlign: 'left',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            {/* Consentimiento — solo en signup */}
            {authMode === 'signup' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  width: '100%',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '5px',
                    border: consentAccepted
                      ? '2px solid rgba(255,255,255,0.80)'
                      : '2px solid rgba(255,255,255,0.35)',
                    background: consentAccepted ? 'rgba(255,255,255,0.20)' : 'transparent',
                    flexShrink: 0,
                    marginTop: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onClick={() => setConsentAccepted((v) => !v)}
                >
                  {consentAccepted && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.60)',
                    lineHeight: 1.5,
                    textAlign: 'left',
                  }}
                >
                  He leído y acepto la{' '}
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPrivacyModalOpen(true)
                    }}
                  >
                    política de privacidad
                  </span>
                </p>
              </label>
            )}

            {/* Botón principal */}
            <button
              onClick={handleSubmit}
              disabled={loading || (authMode === 'signup' && !consentAccepted)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'white',
                color: '#0A5C57',
                fontSize: '16px',
                fontWeight: 700,
                cursor:
                  loading || (authMode === 'signup' && !consentAccepted)
                    ? 'not-allowed'
                    : 'pointer',
                opacity: loading || (authMode === 'signup' && !consentAccepted) ? 0.45 : 1,
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                marginBottom: '20px',
                transition: 'opacity 0.2s, transform 0.15s',
              }}
            >
              {loading ? 'Cargando...' : authMode === 'signup' ? 'Crear cuenta →' : 'Ingresar →'}
            </button>

            {/* Divisor */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>o</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading || (authMode === 'signup' && !consentAccepted)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: '1.5px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor:
                  loading || (authMode === 'signup' && !consentAccepted)
                    ? 'not-allowed'
                    : 'pointer',
                opacity: loading || (authMode === 'signup' && !consentAccepted) ? 0.45 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '36px',
                transition: 'background 0.2s, border-color 0.2s, opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading && !(authMode === 'signup' && !consentAccepted)) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.13)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
              }}
            >
              <GoogleIcon />
              Continuar con Google
            </button>

            {/* Guest mode — de-emphasizado */}
            <button
              onClick={onGuestMode}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.30)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
            >
              Continuar sin cuenta
            </button>

            {/* Volver */}
            <button
              onClick={() => {
                setStep('value')
                setError('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.25)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '8px',
                marginTop: '6px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.50)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
            >
              ← Volver
            </button>
          </>
        )}
      </div>

      {/* Privacy bottom sheet — fuera del contenido centrado para cubrir toda la pantalla */}
      {privacyModalOpen && <PrivacySheet onClose={() => setPrivacyModalOpen(false)} />}
    </div>
  )
}

// ── Privacy bottom sheet ──────────────────────────────────────────────────────
function PrivacySheet({ onClose }: { onClose: () => void }) {
  const items = [
    {
      icon: '🔒',
      title: 'Solo tú ves tus datos',
      desc: 'Tu información financiera es completamente privada y solo accesible desde tu cuenta.',
    },
    {
      icon: '🚫',
      title: 'No compartimos tu información',
      desc: 'Nunca vendemos ni compartimos tus datos financieros con terceros.',
    },
    {
      icon: '📤',
      title: 'Control total sobre tus datos',
      desc: 'Puedes exportar o eliminar tu información cuando quieras.',
    },
    {
      icon: '🔄',
      title: 'Sincronización segura',
      desc: 'Tus datos se sincronizan entre todos los dispositivos vinculados a tu cuenta.',
    },
    {
      icon: '🛡️',
      title: 'Proveedores certificados',
      desc: 'Usamos servicios de autenticación y almacenamiento con altos estándares de seguridad.',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.60)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#111C1B',
          borderRadius: '24px 24px 0 0',
          zIndex: 1000,
          padding: '0 0 env(safe-area-inset-bottom, 24px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.50)',
          animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '12px',
            paddingBottom: '4px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.18)',
            }}
          />
        </div>

        {/* Contenido scrollable */}
        <div
          style={{
            overflowY: 'auto',
            padding: '20px 24px 32px',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}
        >
          {/* Título */}
          <h3
            style={{
              margin: '0 0 6px 0',
              fontSize: '20px',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.3px',
            }}
          >
            🔒 Cómo cuidamos tu información
          </h3>
          <p
            style={{
              margin: '0 0 28px 0',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.5,
            }}
          >
            Tu privacidad es parte del producto, no un requisito legal.
          </p>

          {/* Ítems */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}
          >
            {items.map((item) => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    lineHeight: 1.3,
                    flexShrink: 0,
                    width: '28px',
                    textAlign: 'center',
                  }}
                >
                  {item.icon}
                </span>
                <div>
                  <p
                    style={{
                      margin: '0 0 3px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'white',
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.50)',
                      lineHeight: 1.55,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Ver política completa */}
            <button
              onClick={openPrivacyPolicy}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Ver política completa →
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '14px',
                border: 'none',
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── SVG inline para no depender de librería de íconos ─────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
