'use client'

import { useState } from 'react'
import { AvatarEditor } from '../components/AvatarEditor'
import type { CountryConfig } from '../lib/config'
import type { ExtraIncome, StoredData } from '../lib/types'
import { migrateToMonthlyHistory, capitalizeWords } from '../lib/migrations'
import { saveUserData } from '../lib/supabase'

interface Props {
  config: CountryConfig
  onClearData: () => void
  isPrivacyMode?: boolean
  onTogglePrivacy?: () => void
  userEmail?: string
  onLogOut?: () => Promise<void>
}

export function ProfileScreen({
  config,
  onClearData,
  isPrivacyMode = false,
  onTogglePrivacy,
  userEmail = 'User',
  onLogOut,
}: Props) {
  // Expand/collapse sections
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Editable profile fields
  const [profileData, setProfileData] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tranquilo_profile') : null
    return saved ? JSON.parse(saved) : {
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      telefono: '+57 300 123 4567',
      pais: 'Colombia',
      avatarUrl: '/logo-ui.png',
    }
  })

  const [editingProfile, setEditingProfile] = useState(false)
  const [editData, setEditData] = useState(profileData)

  // Security
  const [pinEnabled, setPinEnabled] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')

  // Preferences
  const [darkMode, setDarkMode] = useState(false)

  // Data management
  const [confirmClear, setConfirmClear] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  // Avatar editor
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [tempAvatarImage, setTempAvatarImage] = useState<string>('')

  // Save profile to localStorage
  const saveProfileData = () => {
    localStorage.setItem('tranquilo_profile', JSON.stringify(editData))
    setProfileData(editData)
    setEditingProfile(false)
  }

  const cancelProfileEdit = () => {
    setEditData(profileData)
    setEditingProfile(false)
  }

  // Handle avatar upload - mostrar editor
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setTempAvatarImage(base64)
        setShowAvatarEditor(true)
        // Reset input para permitir seleccionar el mismo archivo nuevamente
        e.target.value = ''
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle avatar editor save
  const handleAvatarSave = (croppedImage: string) => {
    const newData = { ...profileData, avatarUrl: croppedImage }
    localStorage.setItem('tranquilo_profile', JSON.stringify(newData))
    setProfileData(newData)
    setShowAvatarEditor(false)
    setTempAvatarImage('')
  }

  // Handle avatar editor cancel
  const handleAvatarCancel = () => {
    setShowAvatarEditor(false)
    setTempAvatarImage('')
  }

  // Handle avatar delete
  const handleAvatarDelete = () => {
    const newData = { ...profileData, avatarUrl: '/logo-ui.png' }
    localStorage.setItem('tranquilo_profile', JSON.stringify(newData))
    setProfileData(newData)
  }

  const handleForceSyncToFirestore = async () => {
    console.log("[FORCE SYNC] Forzando sincronización a Supabase")
    alert("⏳ Sincronizando datos a Supabase...")

    // Get userId from localStorage or current auth
    const allKeys = Object.keys(localStorage)
    const userKeys = allKeys.filter(k => k.startsWith('tranquilo_v1_'))

    if (userKeys.length === 0) {
      alert("❌ No estás logueado. Por favor, haz login primero.")
      return
    }

    try {
      // Extract userId from key (e.g., "tranquilo_v1_TCSRjh6kdIacmsf0mUcSWTJtfAj2")
      const userId = userKeys[0].replace('tranquilo_v1_', '')

      // Get current data from localStorage
      const raw = localStorage.getItem(userKeys[0])
      if (!raw) {
        alert("❌ No hay datos en localStorage para sincronizar")
        return
      }

      let data = JSON.parse(raw) as StoredData

      console.log("[FORCE SYNC] Datos encontrados (ANTES):", {
        hasMonthlyHistory: !!data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0,
        monthlyHistoryMonths: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
        expenses: data.expenses?.length ?? 0,
        extraIncomes: data.extraIncomes?.length ?? 0,
        userId,
      })

      // CRITICAL: Migrate old structure (expenses array) to new structure (monthlyHistory)
      // Always migrate if expenses array exists and has data, even if monthlyHistory exists
      if (data.expenses && data.expenses.length > 0) {
        console.log("[FORCE SYNC] 🔄 Detectada estructura antigua - migrando todos los gastos a monthlyHistory...")
        data = migrateToMonthlyHistory(data)
        console.log("[FORCE SYNC] ✅ Migración completada")
      }

      console.log("[FORCE SYNC] Datos después de migración:", {
        hasMonthlyHistory: !!data.monthlyHistory && Object.keys(data.monthlyHistory).length > 0,
        monthlyHistoryMonths: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
      })

      // Log the EXACT data being sent to Supabase
      console.log("[FORCE SYNC] 📤 DATOS ENVIADOS A SUPABASE:", {
        monthlyHistory: data.monthlyHistory ? Object.entries(data.monthlyHistory).map(([m, r]: any) => ({ month: m, expenseCount: r.expenses?.length })) : 'NO EXISTE',
        monthlyIncome: data.monthlyIncome,
        monthlySavings: data.monthlySavings,
        expenses: data.expenses?.length,
        conceptMap: !!data.conceptMap ? Object.keys(data.conceptMap).length : 0,
      })

      // Force save to Supabase
      console.log("[FORCE SYNC] 📤 Llamando saveUserData...")
      try {
        await saveUserData(userId, data)
        console.log("[FORCE SYNC] ✅ saveUserData completado sin errores")
      } catch (saveError) {
        console.error("[FORCE SYNC] ❌ ERROR en saveUserData:", saveError)
        alert("❌ Error guardando en Supabase: " + String(saveError))
        return
      }

      alert("✅ Datos sincronizados a Supabase correctamente\n📊 Ahora abre el app en el celular")
      console.log("[FORCE SYNC] ✅ Sincronización completada")
    } catch (error) {
      console.error("[FORCE SYNC] Error general:", error)
      alert("❌ Error durante la sincronización: " + String(error))
    }
  }

  const handleExportCSV = () => {
    console.log("[EXPORT HIT] handleExportCSV en ProfileScreen.tsx")
    alert("EXPORT EJECUTADO (ProfileScreen)")
    // Buscar la key correcta: primero intentar user-scoped, luego guest
    let raw = null
    const allKeys = Object.keys(localStorage)
    const userKeys = allKeys.filter(k => k.startsWith('tranquilo_v1_'))

    if (userKeys.length > 0) {
      // Si estás logueado, usar la key del usuario
      raw = localStorage.getItem(userKeys[0])
    } else {
      // Si no estás logueado, usar la key guest
      raw = localStorage.getItem('tranquilo_v1')
    }

    const data = raw ? JSON.parse(raw) : {}

    const pocketNames: Record<string, string> = {}
    for (const record of Object.values(data.monthlyHistory ?? {})) {
      const rec = record as any
      for (const p of (rec.pockets ?? [])) {
        pocketNames[p.id] = capitalizeWords(p.name)
      }
    }

    const rows: string[][] = [['Fecha', 'Tipo', 'Categoría', 'pocketId', 'Monto', 'Descripción']]

    // Extraer TODOS los gastos desde monthlyHistory
    const allExpenses = Object.values(data.monthlyHistory || {})
      .flatMap((month: any) => month.expenses || [])

    // Gastos de todos los meses
    for (const e of allExpenses) {
      rows.push([
        e.date.slice(0, 10),
        'gasto',
        pocketNames[e.pocketId] ?? e.pocketId ?? '',
        e.pocketId ?? '',
        String(e.amount),
        e.concept ?? '',
      ])
    }

    // Ingresos extras de todos los meses
    const allExtraIncomes = Object.values(data.monthlyHistory || {})
      .flatMap((month: any) => month.extraIncomes || [])

    for (const i of allExtraIncomes) {
      rows.push([
        i.date.slice(0, 10),
        'ingreso',
        'Ingresos',
        'ingresos',
        String(i.amount),
        i.concept ?? '',
      ])
    }

    // Ordenar por fecha descendente
    const [header, ...body] = rows
    body.sort((a, b) => b[0].localeCompare(a[0]))

    const BOM = '\uFEFF'
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csvContent = BOM + [header, ...body].map(r => r.map(escape).join(',')).join('\r\n')
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tranquilo-datos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.trim().split('\n')
        if (lines.length < 2) {
          setImportMessage('❌ CSV vacío o inválido')
          return
        }

        const raw = localStorage.getItem('tranquilo_v1')
        const data = raw ? JSON.parse(raw) : { expenses: [], extraIncomes: [], pockets: [] }

        const pocketMap: Record<string, string> = {}
        for (const p of (data.pockets ?? [])) {
          pocketMap[p.name] = p.id
        }

        let importedCount = 0

        // Skip header, process data rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').replace('""', '"'))
          if (parts.length < 4) continue

          // Detect if CSV has 6 columns (with pocketId) or 5 columns (without)
          // Column 4 is either pocketId (string like "transport") or monto (numeric)
          const isPocketIdColumn = isNaN(Number(parts[3]))

          let fecha, tipo, categoria, pocketIdFromCsv, monto, descripcion

          if (isPocketIdColumn && parts.length >= 6) {
            // 6-column format: [Fecha, Tipo, Categoría, pocketId, Monto, Descripción]
            [fecha, tipo, categoria, pocketIdFromCsv] = parts
            monto = parts[4]
            descripcion = parts.slice(5).join(',')
            console.log('[CSV Import] 6-column detected:', { fecha, tipo, categoria, pocketIdFromCsv, monto, descripcion })
          } else {
            // 5-column format: [Fecha, Tipo, Categoría, Monto, Descripción]
            [fecha, tipo, categoria, monto] = parts
            descripcion = parts.slice(4).join(',')
            pocketIdFromCsv = null
            console.log('[CSV Import] 5-column format:', { fecha, tipo, categoria, monto, descripcion })
          }

          if (tipo === 'gasto') {
            // Use pocketId from CSV if available, otherwise map from categoria
            const pocketId = pocketIdFromCsv || pocketMap[categoria] || 'recreacion'
            const amount = parseInt(monto) || 0

            console.log('[CSV Import] Adding expense:', { pocketId, amount, concept: descripcion })

            data.expenses.push({
              id: Date.now().toString() + Math.random(),
              date: fecha + 'T00:00:00',
              pocketId,
              amount,
              concept: descripcion,
            })
            importedCount++
          } else if (tipo === 'ingreso') {
            const amount = parseInt(monto) || 0

            console.log('[CSV Import] Adding income:', { amount, note: descripcion })

            data.extraIncomes.push({
              id: Date.now().toString() + Math.random(),
              date: fecha + 'T00:00:00',
              amount,
              note: descripcion,
              category: 'extra' as const,
            })
            importedCount++
          }
        }

        console.log('[CSV Import] Saving to localStorage:', {
          totalExpenses: data.expenses?.length,
          totalIncomes: data.extraIncomes?.length,
          importedCount
        })

        localStorage.setItem('tranquilo_v1', JSON.stringify(data))
        setImportMessage(`✅ ${importedCount} movimientos importados correctamente`)
        setTimeout(() => {
          setImportMessage('')
          window.location.reload()
        }, 2000)
      } catch (err) {
        console.error('[CSV Import] Error:', err)
        setImportMessage('❌ Error al importar. Verifica el formato del CSV')
      }
    }
    reader.readAsText(file)
  }

  const sections = {
    perfil: {
      title: 'Mi Perfil',
      icon: '👤',
      content: [
        { label: 'Nombre', value: profileData.nombre, editable: true, field: 'nombre' },
        { label: 'Email', value: profileData.email, editable: true, field: 'email' },
        { label: 'Teléfono', value: profileData.telefono, editable: true, field: 'telefono' },
        { label: 'País', value: profileData.pais, editable: true, field: 'pais' },
      ]
    },
    foto: {
      title: 'Foto de Perfil',
      icon: '📸',
      content: [
        { label: 'Foto actual', value: profileData.avatarUrl, type: 'image' },
        { label: 'Cambiar', value: 'Subir nueva foto', type: 'button', handler: () => document.querySelector<HTMLInputElement>('input[data-upload-avatar]')?.click() },
        { label: 'Eliminar', value: 'Remover foto', type: 'button-danger', handler: handleAvatarDelete },
      ]
    },
    seguridad: {
      title: 'Seguridad',
      icon: '🔐',
      content: [
        { label: 'PIN de acceso', value: pinEnabled ? '••••' : 'Desactivado', type: 'toggle', toggleState: pinEnabled, toggleHandler: () => setPinEnabled(!pinEnabled) },
      ]
    },
    datos: {
      title: 'Mis Datos',
      icon: '📊',
      content: [
        { label: 'Exportar datos', value: 'Descargar CSV', type: 'button', handler: handleExportCSV },
        { label: 'Importar datos', value: 'Importar CSV', type: 'file-button' },
        { label: 'Sincronizar a Supabase', value: 'Forzar Sincronización', type: 'button', handler: handleForceSyncToFirestore },
        { label: 'Borrar todo', value: 'Eliminar datos', type: 'button-danger', handler: () => setConfirmClear(true) },
      ]
    },
    preferencias: {
      title: 'Preferencias',
      icon: '⚙️',
      content: [
        { label: 'Tema oscuro', value: darkMode ? 'Activado' : 'Desactivado', type: 'toggle', toggleState: darkMode, toggleHandler: () => setDarkMode(!darkMode) },
        { label: 'Ocultar montos', value: isPrivacyMode ? 'Activado' : 'Desactivado', type: 'toggle', toggleState: isPrivacyMode, toggleHandler: () => onTogglePrivacy?.() },
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

        {/* HEADER PREMIUM - Con logo real de la app */}
        <div style={{
          background: 'linear-gradient(160deg, #042F2E 0%, #0D6259 60%, #0891B2 100%)',
          padding: '40px 20px 35px',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Avatar con logo real */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
          }}>
            <img
              src={profileData.avatarUrl}
              alt="Avatar"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Nombre y subtitle */}
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}>
            {profileData.nombre}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '13px',
            opacity: 0.85,
            fontWeight: 500,
          }}>
            {profileData.email}
          </p>

        </div>

        {/* SECCIONES - Cards sutiles y profesionales */}
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
                  {/* Edit buttons for Mi Perfil section */}
                  {section.key === 'perfil' && !editingProfile && (
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditData(profileData)
                          setEditingProfile(true)
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0d6259',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  )}

                  {section.content.map((item: any, i: number) => (
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

                      {/* Edit mode for Mi Perfil */}
                      {section.key === 'perfil' && editingProfile && item.field ? (
                        <input
                          type={item.field === 'email' ? 'email' : 'text'}
                          value={editData[item.field] || ''}
                          onChange={(e) => setEditData({ ...editData, [item.field]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                          }}
                        />
                      ) : item.type === 'image' ? (
                        <div style={{
                          width: '70px',
                          height: '70px',
                          background: '#f3f4f6',
                          borderRadius: '10px',
                          border: '2px dashed #d1d5db',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          <img src={item.value} alt="Avatar" style={{ width: '70px', height: '70px', objectFit: 'cover' }} />
                        </div>
                      ) : item.type === 'file-button' ? (
                        <>
                          <label
                            htmlFor="csv-import-input"
                            className="import-button"
                            style={{
                              width: '100%',
                              display: 'block',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#0d6259',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textAlign: 'center',
                            }}>
                            {item.value}
                          </label>
                          <input
                            id="csv-import-input"
                            type="file"
                            accept=".csv,text/csv,application/vnd.ms-excel"
                            onChange={handleImportCSV}
                            style={{ display: 'none' }}
                          />
                        </>
                      ) : item.type === 'button' || item.type === 'button-danger' ? (
                        <button
                          onClick={item.handler}
                          style={{
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
                          <input
                            type="checkbox"
                            checked={item.toggleState ?? false}
                            onChange={item.toggleHandler}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#0d6259',
                            }}
                          />
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

                  {/* Save/Cancel buttons for Mi Perfil edit mode */}
                  {section.key === 'perfil' && editingProfile && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={cancelProfileEdit}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          background: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#6b7280',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveProfileData}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#10B981',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Guardar Cambios
                      </button>
                    </div>
                  )}

                  {/* Special handling for Seguridad section PIN input */}
                  {section.key === 'seguridad' && pinEnabled && showPinInput && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                      <label style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'block',
                        marginBottom: '6px',
                      }}>
                        Configurar PIN
                      </label>
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Ingresa 4 dígitos"
                        maxLength={4}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          textAlign: 'center',
                          marginBottom: '8px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setShowPinInput(false)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            background: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            if (pin.length === 4 && /^\d+$/.test(pin)) {
                              setShowPinInput(false)
                              setPin('')
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#0d6259',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Special handling for Datos section - confirm clear */}
                  {section.key === 'datos' && confirmClear && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', background: '#fee2e2', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
                        ¿Estás seguro? Esta acción no se puede deshacer.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setConfirmClear(false)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            background: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            onClearData()
                            setConfirmClear(false)
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Import message */}
                  {importMessage && (
                    <div style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textAlign: 'center', background: importMessage.includes('✅') ? '#dcfce7' : '#fee2e2', color: importMessage.includes('✅') ? '#166534' : '#dc2626' }}>
                      {importMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '20px',
          textAlign: 'center',
        }}>
          <button
            
            onClick={async () => {
              if (onLogOut) {
                await onLogOut()
              }
            }}
            style={{
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

        label.import-button:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        label.import-button:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        data-upload-avatar
        style={{ display: 'none' }}
      />

      {/* Avatar Editor Modal */}
      {showAvatarEditor && tempAvatarImage && (
        <AvatarEditor
          imageSrc={tempAvatarImage}
          onSave={handleAvatarSave}
          onCancel={handleAvatarCancel}
        />
      )}
    </div>
  )
}
