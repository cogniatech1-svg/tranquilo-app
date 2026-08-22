'use client'

// DEUDA TÉCNICA: Esta implementación es localStorage-only.
// Los datos de inversiones NO se sincronizan con Supabase.
// Un usuario autenticado perderá sus inversiones al cambiar de dispositivo
// o al limpiar el navegador hasta que se implemente la sincronización.
// Pendiente antes de pasar a producción.

import { useState, useCallback, useEffect } from 'react'
import type { Investment, InvestmentPayment } from '../types/investment'

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

  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      const store = loadStore(userId)
      setInvestments(store.investments)
      setPayments(store.payments)
    })
    return () => {
      active = false
    }
  }, [userId])

  const persist = useCallback(
    (invs: Investment[], pymts: InvestmentPayment[]) => {
      if (!userId) return
      saveStore(userId, { investments: invs, payments: pymts })
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
    removePayment,
  }
}
