'use client'

import { useState } from 'react'
import { signUp, logIn } from '../lib/auth'

interface LoginScreenProps {
  onLoginSuccess: () => void
  onGuestMode?: () => void
}

type Mode = 'login' | 'signup'

export function LoginScreen({ onLoginSuccess, onGuestMode }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSignUp = async () => {
    setError('')

    if (!email || !password || !password2) {
      setError('Completa todos los campos')
      return
    }

    if (!validateEmail(email)) {
      setError('Email inválido')
      return
    }

    if (password.length < 6) {
      setError('Contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== password2) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      onLoginSuccess()
    } catch (err: any) {
      const errorCode = err.code || ''
      if (errorCode.includes('email-already-in-use')) {
        setError('Este email ya está registrado')
      } else if (errorCode.includes('weak-password')) {
        setError('Contraseña muy débil')
      } else {
        setError(`Error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogIn = async () => {
    setError('')

    if (!email || !password) {
      setError('Completa email y contraseña')
      return
    }

    if (!validateEmail(email)) {
      setError('Email inválido')
      return
    }

    setLoading(true)
    try {
      await logIn(email, password)
      onLoginSuccess()
    } catch (err: any) {
      const errorCode = err.code || ''
      if (errorCode.includes('user-not-found')) {
        setError('Usuario no encontrado')
      } else if (errorCode.includes('wrong-password')) {
        setError('Contraseña incorrecta')
      } else {
        setError(`Error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d6259 0%, #0891b2 100%)',
        fontFamily: 'system-ui',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'white',
          borderRadius: '16px',
          padding: '40px 30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #0d6259 0%, #0891b2 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              overflow: 'hidden',
            }}
          >
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
          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Tranquilo
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            Gestiona tus finanzas personales
          </p>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '30px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: mode === 'login' ? '#0d6259' : '#9ca3af',
              borderBottom: mode === 'login' ? '2px solid #0d6259' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: mode === 'signup' ? '#0d6259' : '#9ca3af',
              borderBottom: mode === 'signup' ? '2px solid #0d6259' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Registrarse
          </button>
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              fontFamily: 'system-ui',
              boxSizing: 'border-box',
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0d6259')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: mode === 'signup' ? '16px' : '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              fontFamily: 'system-ui',
              boxSizing: 'border-box',
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0d6259')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </div>

        {/* Confirm Password Field (Sign Up only) */}
        {mode === 'signup' && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Confirmar Contraseña
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                fontFamily: 'system-ui',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0d6259')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              fontSize: '13px',
              color: '#991b1b',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={mode === 'login' ? handleLogIn : handleSignUp}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#0d6259',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.target as HTMLButtonElement).style.background = '#0a4a42'
          }}
          onMouseLeave={(e) => {
            if (!loading) (e.target as HTMLButtonElement).style.background = '#0d6259'
          }}
        >
          {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
        </button>

        {/* Divider */}
        <div style={{
          textAlign: 'center',
          margin: '24px 0',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: '#e5e7eb',
          }} />
          <span style={{
            background: 'white',
            padding: '0 8px',
            color: '#9ca3af',
            fontSize: '12px',
            position: 'relative',
          }}>
            o
          </span>
        </div>

        {/* Guest Mode Button */}
        <button
          onClick={onGuestMode}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid #0d6259',
            background: 'white',
            color: '#0d6259',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#f0f9ff'
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = 'white'
          }}
        >
          Continuar sin Cuenta
        </button>

        {/* Footer */}
        <p
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          {mode === 'login'
            ? '¿No tienes cuenta? Registrate arriba'
            : '¿Ya tienes cuenta? Inicia sesión arriba'}
        </p>
      </div>
    </div>
  )
}
