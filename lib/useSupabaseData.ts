import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from './supabase'
import type { Expense } from './types'

export interface UseSupabaseDataResult {
  expenses: Expense[]
  loading: boolean
  error: string | null
  lastSync: Date | null
  refresh: () => Promise<void>
}

/**
 * Hook para sincronizar gastos desde Supabase en tiempo real
 *
 * Características:
 * - Carga inicial de gastos desde Supabase
 * - Suscripción en tiempo real a cambios (INSERT, UPDATE, DELETE)
 * - Recarga manual con refresh()
 * - Manejo de errores con logging detallado
 *
 * @param userId - ID del usuario autenticado o guest UUID
 * @returns { expenses, loading, error, lastSync, refresh }
 */
export function useSupabaseData(userId: string | null): UseSupabaseDataResult {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const isMountedRef = useRef(true)

  // ───────────────────────────────────────────────────────────────────────────
  // CARGAR GASTOS INICIALES
  // ───────────────────────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    if (!userId) {
      console.log('[useSupabaseData] Skipping load: userId is null')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`[useSupabaseData] Loading expenses for userId=${userId}`)

      const { data, error: queryError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (queryError) {
        console.error(
          `[useSupabaseData] Error loading expenses: code=${queryError.code}, message=${queryError.message}`
        )
        setError(`${queryError.message}`)
        return
      }

      // Transformar datos de Supabase a tipo Expense local
      const transformedExpenses = (data || []).map(e => ({
        id: e.id,
        concept: e.concept,
        amount: e.amount,
        pocketId: e.pocket_id,
        date: e.date,
      }))

      if (isMountedRef.current) {
        setExpenses(transformedExpenses)
        setLastSync(new Date())
        console.log(`[useSupabaseData] ✅ Loaded ${transformedExpenses.length} expenses`)
      }
    } catch (err) {
      console.error('[useSupabaseData] Unexpected error loading expenses:', err)
      if (isMountedRef.current) {
        setError('Error al cargar gastos')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [userId])

  // ───────────────────────────────────────────────────────────────────────────
  // SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL
  // ───────────────────────────────────────────────────────────────────────────
  const subscribeToChanges = useCallback(() => {
    if (!userId) {
      console.log('[useSupabaseData] Skipping subscribe: userId is null')
      return
    }

    console.log(`[useSupabaseData] Subscribing to realtime changes for userId=${userId}`)

    // Crear canal para cambios en gastos
    const channel = supabase
      .channel(`expenses:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Todos los eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log(`[useSupabaseData] Real-time update received:`, payload)

          // Recargar todos los gastos para mantener sincronización
          // (alternativa: procesar el cambio individual si fuera más eficiente)
          await loadExpenses()
        }
      )
      .subscribe((status) => {
        console.log(`[useSupabaseData] Subscription status: ${status}`)
      })

    // Guardar función para desuscribirse
    unsubscribeRef.current = () => {
      console.log(`[useSupabaseData] Unsubscribing from realtime`)
      channel.unsubscribe()
    }
  }, [userId, loadExpenses])

  // ───────────────────────────────────────────────────────────────────────────
  // EFECTO: Cargar datos y suscribirse al montar
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true

    // Cargar datos iniciales
    loadExpenses()

    // Suscribirse a cambios en tiempo real
    subscribeToChanges()

    return () => {
      isMountedRef.current = false
      // Desuscribirse cuando se desmonte
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [userId, loadExpenses, subscribeToChanges])

  // ───────────────────────────────────────────────────────────────────────────
  // REFRESCAR MANUALMENTE
  // ───────────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    console.log('[useSupabaseData] Manual refresh triggered')
    await loadExpenses()
  }, [loadExpenses])

  return {
    expenses,
    loading,
    error,
    lastSync,
    refresh,
  }
}
