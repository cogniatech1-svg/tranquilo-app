'use client'

import { useState } from 'react'
import { restoreFromCSV } from '../lib/restore-from-csv'

interface RecoveryScreenProps {
  userId: string
  onRestored: () => void
}

export function RecoveryScreen({ userId, onRestored }: RecoveryScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const csvText = await file.text()
      await restoreFromCSV(csvText, userId)
      setSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        onRestored()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error restoring data')
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📊 Restaurar Datos</h1>

        {!success ? (
          <>
            <p style={styles.description}>
              Sube tu archivo CSV de respaldo para recuperar tus gastos de Abril 2026.
            </p>

            <label style={styles.fileLabel}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              <span style={{
                ...styles.fileButton,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}>
                {isLoading ? '⏳ Restaurando...' : '📁 Seleccionar CSV'}
              </span>
            </label>

            {error && (
              <div style={styles.error}>
                ❌ {error}
              </div>
            )}
          </>
        ) : (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>¡Datos Restaurados!</h2>
            <p style={styles.successText}>
              Se han recuperado 260+ transacciones de Abril 2026.
            </p>
            <p style={styles.successSubtext}>Cargando la app...</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
    lineHeight: '1.5',
  },
  fileLabel: {
    display: 'block',
    marginBottom: '20px',
  },
  fileButton: {
    display: 'block',
    padding: '15px',
    backgroundColor: '#007AFF',
    color: 'white',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'background-color 0.2s',
  },
  error: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#FEE',
    color: '#C33',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  successBox: {
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  successText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  successSubtext: {
    fontSize: '12px',
    color: '#999',
    marginTop: '15px',
  },
}
