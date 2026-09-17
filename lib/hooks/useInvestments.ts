'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Investment, InvestmentPayment } from '../types/investment'
import { supabase, saveInvestmentsData, loadInvestmentsData } from '../supabase'

const STORAGE_KEY = 'tranquilo_investments_v1'

interface InvestmentsStore {
  investments: Investment[]
  payments: InvestmentPayment[]
}

function loadStore(userId: string): InvestmentsStore {
  if (typeof window === 'undefined') return { investments: [], payments: [] }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    if (!raw) return { investments: [], payments: [] }
    return JSON.parse(raw) as InvestmentsStore
  } catch {
    return { investments: [], payments: [] }
  }
}

function saveStore(userId: string, store: InvestmentsStore): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(store))
  } catch {
    console.warn('[useInvestments] Error guardando en localStorage')
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useInvestments(userId: string | null) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<InvestmentPayment[]>([])

  const syncedForUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      // 1. localStorage primero: respuesta visual instantánea
      const local = loadStore(userId)
      if (!active) return
      setInvestments(local.investments)
      setPayments(local.payments)

      // 2. Verificar si hay sesión autenticada
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) return
      const isAuthenticated = !!session?.user && session.user.id === userId
      if (!isAuthenticated) return

      // 3. Migración one-shot: subir datos locales que aún no están en Supabase
      if (local.investments.length > 0 && syncedForUserRef.current !== userId) {
        await saveInvestmentsData(userId, local.investments, local.payments)
        syncedForUserRef.current = userId
      }

      // 4. Supabase es fuente durable — cargar y reconciliar
      const remote = await loadInvestmentsData(userId)
      if (!active || !remote) return
      setInvestments(remote.investments)
      // Re-leer localStorage aquí: el usuario puede haber agregado pagos mientras
      // este effect esperaba la respuesta de Supabase (local capturado arriba es viejo).
      const freshLocal = loadStore(userId)
      const remoteHasPayments = remote.payments.length > 0
      const freshLocalHasPayments = freshLocal.payments.length > 0
      const finalPayments = remoteHasPayments
        ? remote.payments
        : freshLocalHasPayments
          ? freshLocal.payments
          : []
      setPayments(finalPayments)
      saveStore(userId, { investments: remote.investments, payments: finalPayments })
      syncedForUserRef.current = userId
    })()
    return () => {
      active = false
    }
  }, [userId])

  const persist = useCallback(
    (invs: Investment[], pymts: InvestmentPayment[]) => {
      if (!userId) return
      // localStorage: sincrónico, UI responde de inmediato
      saveStore(userId, { investments: invs, payments: pymts })
      // Supabase: asincrónico y no bloqueante
      supabase.auth.getSession().then(({ data: { session } }) => {
        const isAuthenticated = !!session?.user && session.user.id === userId
        if (!isAuthenticated) return
        saveInvestmentsData(userId, invs, pymts).catch((e) =>
          console.warn('[useInvestments] Error sync Supabase:', e)
        )
      })
    },
    [userId]
  )

  const addInvestment = useCallback(
    (data: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!userId) return
      const now = new Date().toISOString()
      const newInvestment: Investment = {
        ...data,
        id: createId(),
        userId,
        createdAt: now,
        updatedAt: now,
      }
      setInvestments((prev) => {
        const updated = [...prev, newInvestment]
        persist(updated, payments)
        return updated
      })
    },
    [userId, payments, persist]
  )

  const updateInvestment = useCallback(
    (id: string, data: Partial<Omit<Investment, 'id' | 'userId' | 'createdAt'>>) => {
      setInvestments((prev) => {
        const updated = prev.map((inv) =>
          inv.id === id ? { ...inv, ...data, updatedAt: new Date().toISOString() } : inv
        )
        persist(updated, payments)
        return updated
      })
    },
    [payments, persist]
  )

  const deleteInvestment = useCallback(
    (id: string) => {
      setInvestments((prev) => {
        const updated = prev.filter((inv) => inv.id !== id)
        persist(updated, payments)
        return updated
      })
    },
    [payments, persist]
  )

  const addPayment = useCallback(
    (
      investmentId: string,
      data: Omit<InvestmentPayment, 'id' | 'investmentId' | 'userId' | 'createdAt'>
    ) => {
      if (!userId) return
      const now = new Date().toISOString()
      const newPayment: InvestmentPayment = {
        ...data,
        id: createId(),
        investmentId,
        userId,
        createdAt: now,
      }
      setPayments((prev) => {
        const updated = [...prev, newPayment]
        persist(investments, updated)
        return updated
      })
    },
    [userId, investments, persist]
  )

  const updatePayment = useCallback(
    (
      paymentId: string,
      data: Partial<Omit<InvestmentPayment, 'id' | 'investmentId' | 'userId' | 'createdAt'>>
    ) => {
      setPayments((prev) => {
        const updated = prev.map((p) => (p.id === paymentId ? { ...p, ...data } : p))
        persist(investments, updated)
        return updated
      })
    },
    [investments, persist]
  )

  const removePayment = useCallback(
    (paymentId: string) => {
      setPayments((prev) => {
        const updated = prev.filter((p) => p.id !== paymentId)
        persist(investments, updated)
        return updated
      })
    },
    [investments, persist]
  )

  return {
    investments,
    payments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addPayment,
    updatePayment,
    removePayment,
  }
}
