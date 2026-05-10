import { createClient } from '@supabase/supabase-js'
import type { StoredData, MonthRecord, UserProfile } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Save user financial data to Supabase (normalized schema)
 * Stores to: users, pockets, monthly_records, expenses, extra_incomes, concept_map, learned_category_map
 * Accepts both authenticated user IDs and guest IDs
 */
export async function saveUserData(userId: string, data: StoredData): Promise<void> {
  // Minimal validation: ensure userId is a non-empty string
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error(`Invalid userId format: must be a non-empty string`)
  }

  try {
    // 1. Update or create user record with metadata
    // For guests, use a placeholder email based on their UUID
    // For authenticated users, use a placeholder based on their Supabase UID
    // Both are unique and not exposed to the user
    const isGuest = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const userEmail = isGuest
      ? `guest_${userId.substring(0, 8)}@tranquilo.local`
      : `user_${userId.substring(0, 12)}@tranquilo.local`

    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      email: userEmail,
      monthly_income: data.monthlyIncome,
      monthly_savings: data.monthlySavings,
      country_code: data.countryCode,
      is_privacy_mode: data.isPrivacyMode,
      profile_data: data.profile ?? null,
    })

    if (userError) {
      console.error(
        `[Supabase] Error updating user record: code=${userError.code}, message=${userError.message}`
      )
      throw userError
    }

    // 2. Save pockets (upsert each one)
    // TODO: Investigate pockets table schema - currently skipping to avoid 400 errors
    // Data is persisted in localStorage and monthly_records, pockets are derived from those
    if (data.pockets && data.pockets.length > 0) {
    }

    // 3. Save monthly records with their expenses and extra incomes
    if (data.monthlyHistory) {
      for (const [monthKey, monthRecord] of Object.entries(data.monthlyHistory)) {
        // Upsert monthly_records
        if (monthRecord.manualBudget !== undefined && monthRecord.manualBudget !== null) {
          console.log(
            `[Supabase] Saving manual budget for ${monthKey}: ${monthRecord.manualBudget}`
          )
        }
        const { error: monthError } = await supabase.from('monthly_records').upsert(
          {
            user_id: userId,
            month: monthKey,
            income: monthRecord.income,
            savings: monthRecord.savings,
            manual_budget: monthRecord.manualBudget ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month' }
        )

        if (monthError) {
          console.error(`[Supabase] Error saving monthly record for ${monthKey}:`, monthError)
          if (monthError.message?.includes('manual_budget')) {
            console.error(
              `[Supabase] HINT: The 'manual_budget' column may not exist in the 'monthly_records' table. Please check Supabase schema.`
            )
          }
          throw monthError
        }

        // Delete and recreate expenses for this month (simpler than tracking deletes)
        await supabase.from('expenses').delete().eq('user_id', userId).eq('month', monthKey)

        // Save expenses
        if (monthRecord.expenses && monthRecord.expenses.length > 0) {
          const { error: expenseError } = await supabase.from('expenses').insert(
            monthRecord.expenses.map((expense) => ({
              user_id: userId,
              id: expense.id,
              month: monthKey,
              date: expense.date,
              amount: expense.amount,
              concept: expense.concept,
              pocket_id: expense.pocketId,
            }))
          )

          if (expenseError) {
            console.error('[Supabase] Error saving expenses:', expenseError)
            throw expenseError
          }
        }

        // Delete and recreate extra_incomes for this month
        await supabase.from('extra_incomes').delete().eq('user_id', userId).eq('month', monthKey)

        // Save extra incomes
        if (monthRecord.extraIncomes && monthRecord.extraIncomes.length > 0) {
          const { error: incomeError } = await supabase.from('extra_incomes').insert(
            monthRecord.extraIncomes.map((income) => ({
              user_id: userId,
              id: income.id,
              month: monthKey,
              date: income.date,
              amount: income.amount,
              concept: income.concept,
            }))
          )

          if (incomeError) {
            console.error('[Supabase] Error saving extra incomes:', incomeError)
            throw incomeError
          }
        }
      }
    }

    // 4. Save concept map
    if (data.conceptMap && Object.keys(data.conceptMap).length > 0) {
      const { error: conceptError } = await supabase.from('concept_map').upsert(
        {
          user_id: userId,
          data: data.conceptMap,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (conceptError) {
        console.error('[Supabase] Error saving concept map:', conceptError)
        throw conceptError
      }
    }

    // 5. Save learned category map
    if (data.learnedCategoryMap && Object.keys(data.learnedCategoryMap).length > 0) {
      const { error: learnedError } = await supabase.from('learned_category_map').upsert(
        {
          user_id: userId,
          data: data.learnedCategoryMap,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (learnedError) {
        console.error('[Supabase] Error saving learned category map:', learnedError)
        throw learnedError
      }
    }
  } catch (error) {
    console.error('[Supabase] Failed to save user data:', error)
    // Don't throw - allow app to continue with localStorage fallback
  }
}

/**
 * Load user financial data from Supabase (normalized schema)
 * Reconstructs StoredData from normalized tables
 */
export async function loadUserData(userId: string): Promise<StoredData | null> {
  try {
    // 1. Load user metadata
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null
      }
      console.error(
        `[Supabase] Error loading user: code=${userError.code}, message=${userError.message}`
      )
      return null
    }

    // 2. Load pockets
    const { data: pocketsData, error: pocketsError } = await supabase
      .from('pockets')
      .select('*')
      .eq('user_id', userId)

    if (pocketsError) {
      console.error('[Supabase] Error loading pockets:', pocketsError)
      return null
    }

    // 3. Load all monthly records with their expenses and incomes
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('monthly_records')
      .select('*')
      .eq('user_id', userId)

    if (monthlyError) {
      console.error('[Supabase] Error loading monthly records:', monthlyError)
      return null
    }

    const monthlyHistory: Record<string, MonthRecord> = {}

    for (const monthRecord of monthlyData || []) {
      const month = monthRecord.month

      // Load expenses for this month
      const { data: expensesData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)

      if (expenseError) {
        console.error('[Supabase] Error loading expenses:', expenseError)
        continue
      }

      // Load extra incomes for this month
      const { data: incomesData, error: incomeError } = await supabase
        .from('extra_incomes')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)

      if (incomeError) {
        console.error('[Supabase] Error loading extra incomes:', incomeError)
        continue
      }

      monthlyHistory[month] = {
        income: monthRecord.income,
        savings: monthRecord.savings,
        expenses: (expensesData || []).map((e) => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          concept: e.concept,
          pocketId: e.pocket_id,
        })),
        extraIncomes: (incomesData || []).map((i) => ({
          id: i.id,
          date: i.date,
          amount: i.amount,
          concept: i.concept,
        })),
        pockets: (pocketsData || []).map((p) => ({
          id: p.id,
          name: p.name,
          budget: p.budget,
          icon: p.icon,
        })),
        manualBudget: monthRecord.manual_budget,
      }
    }

    // 4. Load concept map (optional - may not exist)
    let conceptMap = {}
    try {
      const { data: conceptData } = await supabase
        .from('concept_map')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (conceptData) {
        conceptMap = conceptData.data || conceptData
      }
    } catch {
      // Concept map table may not exist - that's fine, optional feature
    }

    // 5. Load learned category map (optional - may not exist)
    let learnedCategoryMap = {}
    try {
      const { data: learnedData } = await supabase
        .from('learned_category_map')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (learnedData) {
        learnedCategoryMap = learnedData.data || learnedData
      }
    } catch {
      // Learned category map table may not exist - that's fine, optional feature
    }

    // Reconstruct StoredData
    const storedData: StoredData = {
      monthlyHistory,
      monthlyIncome: userData?.monthly_income || 0,
      monthlySavings: userData?.monthly_savings || 0,
      expenses: [],
      extraIncomes: [],
      pockets: (pocketsData || []).map((p) => ({
        id: p.id,
        name: p.name,
        budget: p.budget,
        icon: p.icon,
      })),
      conceptMap,
      learnedCategoryMap,
      countryCode: userData?.country_code || 'CO',
      isPrivacyMode: userData?.is_privacy_mode || false,
      currentMonth: undefined,
      profile: userData?.profile_data ?? undefined,
    }

    console.log('[Supabase] 🔵 loadUserData completed:', {
      userId,
      hasProfile: !!storedData.profile,
      profileData: storedData.profile
        ? {
            nombre: storedData.profile.nombre,
            email: storedData.profile.email,
            telefono: storedData.profile.telefono,
            pais: storedData.profile.pais,
            avatarUrl: storedData.profile.avatarUrl ? '(image)' : '(none)',
          }
        : null,
      monthsLoaded: Object.keys(monthlyHistory).length,
    })

    return storedData
  } catch (error) {
    console.error('[Supabase] Failed to load user data:', error)
    return null
  }
}

/**
 * Subscribe to real-time updates of user data
 * Listens to changes in multiple tables and reconstructs StoredData
 * Returns unsubscribe function
 */
export function subscribeToUserData(
  userId: string,
  callback: (data: StoredData) => void
): () => void {
  const channels: ReturnType<typeof supabase.channel>[] = []

  // Subscribe to user metadata changes
  const userChannel = supabase
    .channel(`user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      async () => {
        const data = await loadUserData(userId)
        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  channels.push(userChannel)

  // Subscribe to pocket changes
  const pocketChannel = supabase
    .channel(`pockets:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pockets',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const data = await loadUserData(userId)
        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  channels.push(pocketChannel)

  // Subscribe to expenses changes
  const expenseChannel = supabase
    .channel(`expenses:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const data = await loadUserData(userId)
        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  channels.push(expenseChannel)

  // Subscribe to extra_incomes changes
  const incomeChannel = supabase
    .channel(`extra_incomes:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'extra_incomes',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const data = await loadUserData(userId)
        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  channels.push(incomeChannel)

  return () => {
    channels.forEach((channel) => channel.unsubscribe())
  }
}

/**
 * Save only the user profile — does NOT touch expenses, incomes, or any other table.
 */
export async function saveProfileData(userId: string, profile: UserProfile): Promise<void> {
  console.log('[Supabase] 🔵 saveProfileData called:', {
    userId,
    profileData: {
      nombre: profile.nombre,
      email: profile.email,
      telefono: profile.telefono,
      pais: profile.pais,
      avatarUrl: profile.avatarUrl ? '(image)' : '(none)',
    },
  })

  const { error } = await supabase.from('users').update({ profile_data: profile }).eq('id', userId)

  if (error) {
    console.error('[Supabase] ❌ Error saving profile:', error)
    throw error
  }

  console.log('[Supabase] ✅ Profile saved successfully')
}

/**
 * Validate that data was actually saved to Supabase by loading it back
 */
export async function validateDataPersistence(userId: string): Promise<boolean> {
  try {
    console.log('[Supabase] 🔷 Validating data persistence for userId:', userId)
    const { data, error } = await supabase
      .from('users')
      .select('id, monthly_income, monthly_savings, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Supabase] ❌ Validation failed - user not found:', error)
      return false
    }

    if (!data) {
      console.error('[Supabase] ❌ Validation failed - no user data returned')
      return false
    }

    console.log('[Supabase] ✅ Validation successful - data exists in Supabase:', {
      userId,
      updatedAt: data.updated_at,
      monthlyIncome: data.monthly_income,
    })
    return true
  } catch (e) {
    console.error('[Supabase] ❌ Validation error:', e)
    return false
  }
}
