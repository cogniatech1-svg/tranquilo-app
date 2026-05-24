'use client'

/**
 * app/reset-password/page.tsx
 *
 * Pantalla para establecer una nueva contraseña tras hacer clic en el enlace
 * de recuperación enviado por email. Supabase incluye el token de recuperación
 * en el fragmento #access_token=...&type=recovery de la URL.
 *
 * Flujo:
 *   Email de recuperación → /reset-password#access_token=...&type=recovery
 *   → usuario establece contraseña → redirige a /
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

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
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Procesar el token de recuperación del fragmento de la URL.
    // Si no hay sesión válida, redirigir al inicio.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        router.replace('/')
      }
    })
  }, [router])

  const handleSubmit = async () => {
    setError('')
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(`Error: ${updateError.message}`)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.replace('/'), 2000)
    }
  }

  if (!ready) return null

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
      }}
    >
      <style>{`
        .reset-input::placeholder { color: rgba(255,255,255,0.4); }
        .reset-input:focus { border-color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.20) !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/icons/logo-tranquilo.png"
            alt="Tranquilo"
            style={{ width: '56px', height: '56px', objectFit: 'contain' }}
          />
        </div>

        <h1
          style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 700,
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}
        >
          Nueva contraseña
        </h1>

        {!success ? (
          <>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '14px',
                textAlign: 'center',
                margin: '0 0 28px 0',
                lineHeight: 1.5,
              }}
            >
              Elige una contraseña para tu cuenta. Podrás usarla junto con Google para iniciar
              sesión.
            </p>

            <input
              className="reset-input"
              type="password"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...baseInputStyle, marginBottom: '12px' }}
            />
            <input
              className="reset-input"
              type="password"
              placeholder="Confirmar contraseña"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={{ ...baseInputStyle, marginBottom: '16px' }}
            />

            {error && (
              <p
                style={{
                  color: '#FCA5A5',
                  fontSize: '13px',
                  margin: '0 0 14px 0',
                  textAlign: 'center',
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '14px',
                border: 'none',
                background: 'white',
                color: '#0A5C57',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Establecer contraseña →'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <p style={{ color: '#6EE7B7', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
              ✅ Contraseña establecida
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', margin: 0 }}>
              Redirigiendo a la app...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
