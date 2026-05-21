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

  console.log('[Supabase] 🟢 INICIANDO saveUserData:', {
    userId,
    monthlyHistoryMonths: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
    monthlyIncome: data.monthlyIncome,
    hasProfile: !!data.profile,
  })

  try {
    // 1. Update or create user record with metadata
    const isGuest = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

    // For guests use a stable placeholder. For auth users, fetch the real email from Supabase
    // auth so we never overwrite it with a placeholder on subsequent saves.
    let userEmail: string | null = null
    if (isGuest) {
      userEmail = `guest_${userId.substring(0, 8)}@tranquilo.local`
    } else {
      const { data: authUser } = await supabase.auth.getUser()
      userEmail = authUser?.user?.email ?? null
    }

    console.log('[Supabase] 🟡 Guardando users record:', { userId, isGuest, hasEmail: !!userEmail })

    const userRecord: Record<string, unknown> = {
      id: userId,
      monthly_income: data.monthlyIncome,
      monthly_savings: data.monthlySavings,
      country_code: data.countryCode,
      is_privacy_mode: data.isPrivacyMode,
      profile_data: data.profile ?? null,
    }
    if (userEmail) userRecord.email = userEmail

    const { error: userError } = await supabase.from('users').upsert(userRecord)

    if (userError) {
      console.error(
        `[Supabase] ❌ Error guardando users record: code=${userError.code}, message=${userError.message}`
      )
      throw userError
    }
    console.log('[Supabase] ✅ users record guardado')

    // 2. Save pockets FIRST (so expenses can reference them)
    // Pockets must exist before expenses can be saved (foreign key constraint)
    console.log('[Supabase] 🟡 Guardando pockets:', {
      pocketCount: data.pockets?.length ?? 0,
    })
    if (data.pockets && data.pockets.length > 0) {
      const { error: pocketError } = await supabase.from('pockets').upsert(
        data.pockets.map((pocket) => ({
          user_id: userId,
          pocket_id: pocket.id,
          name: pocket.name,
          budget: pocket.budget,
          icon: pocket.icon,
        })),
        { onConflict: 'user_id,pocket_id' }
      )

      if (pocketError) {
        console.error('[Supabase] Error saving pockets:', pocketError)
        // Non-blocking: continue even if pockets fail (they're in localStorage anyway)
      } else {
        console.log('[Supabase] ✅ Pockets guardados exitosamente')
        // Remove pockets that no longer exist in the user's list
        const currentPocketIds = data.pockets.map((p) => p.id)
        await supabase
          .from('pockets')
          .delete()
          .eq('user_id', userId)
          .not('pocket_id', 'in', `(${currentPocketIds.join(',')})`)
      }
    }

    // 3. Save monthly records with their expenses and extra incomes
    console.log('[Supabase] 🟡 Guardando monthly_records:', {
      monthCount: data.monthlyHistory ? Object.keys(data.monthlyHistory).length : 0,
    })
    if (data.monthlyHistory) {
      for (const [monthKey, monthRecord] of Object.entries(data.monthlyHistory)) {
        // Upsert monthly_records
        if (monthRecord.manualBudget !== undefined && monthRecord.manualBudget !== null) {
          console.log(
            `[Supabase] Saving manual budget for ${monthKey}: ${monthRecord.manualBudget}`
          )
        }
        // NOTE: Pockets are persisted in localStorage and monthly_records doesn't have a pockets_data column.
        // Supabase schema only supports: income, savings, manual_budget, updated_at, user_id, month
        const monthRecordData: Record<string, unknown> = {
          user_id: userId,
          month: monthKey,
          income: monthRecord.income,
          savings: monthRecord.savings,
          manual_budget: monthRecord.manualBudget ?? null,
          updated_at: new Date().toISOString(),
        }

        const { error: monthError } = await supabase
          .from('monthly_records')
          .upsert(monthRecordData, { onConflict: 'user_id,month' })

        if (monthError) {
          console.error(`[Supabase] Error saving monthly record for ${monthKey}:`, monthError)
          if (monthError.message?.includes('manual_budget')) {
            console.error(
              `[Supabase] HINT: The 'manual_budget' column may not exist in the 'monthly_records' table. Please check Supabase schema.`
            )
          }
          throw monthError
        }

        // Upsert expenses first (data is safe even if stale cleanup fails below)
        if (monthRecord.expenses && monthRecord.expenses.length > 0) {
          const { error: expenseError } = await supabase.from('expenses').upsert(
            monthRecord.expenses.map((expense) => ({
              user_id: userId,
              id: expense.id,
              month: monthKey,
              date: expense.date,
              amount: expense.amount,
              concept: expense.concept,
              pocket_id: expense.pocketId,
            })),
            { onConflict: 'id' }
          )

          if (expenseError) {
            console.warn(
              '[Supabase] ⚠️ Expenses not saved to Supabase, but data is safe in localStorage'
            )
          }
        }

        // Remove expenses for this month that are no longer in the current list
        const currentExpenseIds = monthRecord.expenses?.map((e) => e.id) ?? []
        if (currentExpenseIds.length > 0) {
          await supabase
            .from('expenses')
            .delete()
            .eq('user_id', userId)
            .eq('month', monthKey)
            .not('id', 'in', `(${currentExpenseIds.join(',')})`)
        } else {
          await supabase.from('expenses').delete().eq('user_id', userId).eq('month', monthKey)
        }

        // Upsert extra incomes first (data is safe even if stale cleanup fails below)
        if (monthRecord.extraIncomes && monthRecord.extraIncomes.length > 0) {
          const { error: incomeError } = await supabase.from('extra_incomes').upsert(
            monthRecord.extraIncomes.map((income) => ({
              user_id: userId,
              id: income.id,
              month: monthKey,
              date: income.date,
              amount: income.amount,
              concept: income.concept,
            })),
            { onConflict: 'id' }
          )

          if (incomeError) {
            console.warn(
              '[Supabase] ⚠️ Extra incomes not saved to Supabase, but data is safe in localStorage'
            )
          }
        }

        // Remove extra incomes for this month that are no longer in the current list
        const currentIncomeIds = monthRecord.extraIncomes?.map((i) => i.id) ?? []
        if (currentIncomeIds.length > 0) {
          await supabase
            .from('extra_incomes')
            .delete()
            .eq('user_id', userId)
            .eq('month', monthKey)
            .not('id', 'in', `(${currentIncomeIds.join(',')})`)
        } else {
          await supabase.from('extra_incomes').delete().eq('user_id', userId).eq('month', monthKey)
        }
      }
    }

    // 4. Save concept map (optional - continue even if it fails)
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
        console.warn('[Supabase] ⚠️ Warning saving concept map (non-blocking):', conceptError)
        // Don't throw - concept map is optional
      }
    }

    // 5. Save learned category map (optional - continue even if it fails)
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
        console.warn(
          '[Supabase] ⚠️ Warning saving learned category map (non-blocking):',
          learnedError
        )
        // Don't throw - learned category map is optional
      }
    }
    console.log('[Supabase] 🟢 ✅ saveUserData completado exitosamente')
  } catch (error) {
    let errorMsg = 'Error desconocido'
    if (error instanceof Error) {
      errorMsg = error.message
    } else if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      if (obj.message) errorMsg = String(obj.message)
      else if (obj.error) errorMsg = String(obj.error)
      else if (obj.hint) errorMsg = String(obj.hint)
      else errorMsg = JSON.stringify(obj).substring(0, 300)
    }
    console.error('[Supabase] ❌ CRÍTICO: Error guardando en Supabase:', errorMsg)
    console.error('[Supabase] Error object:', error)
    // Re-throw so the auto-save can show the real Supabase error in the UI banner
    throw error
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

      // pockets_data column does not exist in monthly_records schema.
      // Fallback: use global pockets loaded from the pockets table.
      // When pockets_data is eventually added to the schema, this still works
      // because it will be non-null and will take priority over the fallback.
      let monthPockets: typeof pocketsData = []
      if (monthRecord.pockets_data) {
        try {
          monthPockets = JSON.parse(monthRecord.pockets_data)
        } catch (e) {
          console.warn(`[Supabase] Failed to parse pockets_data for month ${month}:`, e)
          monthPockets = []
        }
      }

      // If no per-month pockets, use the global pockets from the pockets table
      const resolvedPockets =
        monthPockets.length > 0
          ? monthPockets
          : (pocketsData || []).map((p) => ({
              id: p.pocket_id,
              name: p.name,
              budget: p.budget,
              icon: p.icon,
            }))

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
        pockets: resolvedPockets,
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
        id: p.pocket_id,
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
            pais: storedData.profile.pais,
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
 * Migrate all guest user data to authenticated user
 * Called when a guest user signs up and authenticates
 * Safely migrates all data without overwriting existing auth user data
 */
export async function migrateGuestDataToAuthenticatedUser(
  guestUserId: string,
  newAuthenticatedUserId: string
): Promise<{ success: boolean; itemsMigrated: number; error?: string }> {
  try {
    console.log('[Supabase] 🟢 Starting guest→auth migration:', {
      guestUserId: guestUserId.substring(0, 8) + '...',
      authenticatedUserId: newAuthenticatedUserId.substring(0, 8) + '...',
    })

    // 1. Check if authenticated user already has data (don't overwrite)
    console.log('[Supabase] 🟡 Checking if auth user already has data...')
    const { data: authUserExpenses, error: checkError } = await supabase
      .from('expenses')
      .select('id', { count: 'exact' })
      .eq('user_id', newAuthenticatedUserId)
      .limit(1)

    if (checkError) {
      const errorMsg = `Failed to check auth user data: ${checkError.message}`
      console.warn('[Supabase] ⚠️', errorMsg)
      return { success: false, itemsMigrated: 0, error: errorMsg }
    }

    if (authUserExpenses && authUserExpenses.length > 0) {
      const warnMsg = 'Auth user already has data, skipping migration (data already exists)'
      console.warn('[Supabase] ⚠️', warnMsg)
      return { success: true, itemsMigrated: 0, error: undefined }
    }

    let totalMigrated = 0

    // 2. Migrate users record metadata
    console.log('[Supabase] 🟡 Migrating users record...')
    const { data: guestUserData } = await supabase
      .from('users')
      .select('*')
      .eq('id', guestUserId)
      .single()

    if (guestUserData) {
      const { error: userUpdateError } = await supabase.from('users').upsert({
        ...guestUserData,
        id: newAuthenticatedUserId,
        updated_at: new Date().toISOString(),
      })

      if (userUpdateError) {
        console.warn(
          '[Supabase] ⚠️ Warning migrating users record (non-blocking):',
          userUpdateError
        )
      } else {
        console.log('[Supabase] ✅ Users record migrated')
      }
    }

    // 3. Migrate expenses (get all, then update user_id)
    console.log('[Supabase] 🟡 Migrating expenses...')
    const { data: guestExpenses, error: getExpensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', guestUserId)

    if (getExpensesError) {
      const errorMsg = `Failed to fetch guest expenses: ${getExpensesError.message}`
      console.error('[Supabase]', errorMsg)
      return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
    }

    if (guestExpenses && guestExpenses.length > 0) {
      // Update all expenses at once
      const { error: updateExpensesError } = await supabase
        .from('expenses')
        .update({ user_id: newAuthenticatedUserId })
        .eq('user_id', guestUserId)

      if (updateExpensesError) {
        const errorMsg = `Failed to update expenses: ${updateExpensesError.message}`
        console.error('[Supabase]', errorMsg)
        return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
      }

      totalMigrated += guestExpenses.length
      console.log(`[Supabase] ✅ ${guestExpenses.length} expenses migrated`)
    }

    // 4. Migrate extra_incomes
    console.log('[Supabase] 🟡 Migrating extra incomes...')
    const { data: guestIncomes, error: getIncomesError } = await supabase
      .from('extra_incomes')
      .select('*')
      .eq('user_id', guestUserId)

    if (getIncomesError) {
      const errorMsg = `Failed to fetch guest incomes: ${getIncomesError.message}`
      console.error('[Supabase]', errorMsg)
      return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
    }

    if (guestIncomes && guestIncomes.length > 0) {
      const { error: updateIncomesError } = await supabase
        .from('extra_incomes')
        .update({ user_id: newAuthenticatedUserId })
        .eq('user_id', guestUserId)

      if (updateIncomesError) {
        const errorMsg = `Failed to update extra incomes: ${updateIncomesError.message}`
        console.error('[Supabase]', errorMsg)
        return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
      }

      totalMigrated += guestIncomes.length
      console.log(`[Supabase] ✅ ${guestIncomes.length} extra incomes migrated`)
    }

    // 5. Migrate monthly_records
    console.log('[Supabase] 🟡 Migrating monthly records...')
    const { data: guestMonths, error: getMonthsError } = await supabase
      .from('monthly_records')
      .select('*')
      .eq('user_id', guestUserId)

    if (getMonthsError) {
      const errorMsg = `Failed to fetch guest monthly records: ${getMonthsError.message}`
      console.error('[Supabase]', errorMsg)
      return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
    }

    if (guestMonths && guestMonths.length > 0) {
      const { error: updateMonthsError } = await supabase
        .from('monthly_records')
        .update({ user_id: newAuthenticatedUserId })
        .eq('user_id', guestUserId)

      if (updateMonthsError) {
        const errorMsg = `Failed to update monthly records: ${updateMonthsError.message}`
        console.error('[Supabase]', errorMsg)
        return { success: false, itemsMigrated: totalMigrated, error: errorMsg }
      }

      totalMigrated += guestMonths.length
      console.log(`[Supabase] ✅ ${guestMonths.length} monthly records migrated`)
    }

    // 6. Migrate concept_map
    console.log('[Supabase] 🟡 Migrating concept map...')
    const { data: conceptMap } = await supabase
      .from('concept_map')
      .select('*')
      .eq('user_id', guestUserId)
      .single()

    if (conceptMap) {
      const { error: updateConceptError } = await supabase
        .from('concept_map')
        .update({ user_id: newAuthenticatedUserId })
        .eq('user_id', guestUserId)

      if (updateConceptError) {
        console.warn(
          '[Supabase] ⚠️ Warning migrating concept map (non-blocking):',
          updateConceptError
        )
      } else {
        console.log('[Supabase] ✅ Concept map migrated')
      }
    }

    // 7. Migrate learned_category_map
    console.log('[Supabase] 🟡 Migrating learned category map...')
    const { data: learnedMap } = await supabase
      .from('learned_category_map')
      .select('*')
      .eq('user_id', guestUserId)
      .single()

    if (learnedMap) {
      const { error: updateLearnedError } = await supabase
        .from('learned_category_map')
        .update({ user_id: newAuthenticatedUserId })
        .eq('user_id', guestUserId)

      if (updateLearnedError) {
        console.warn(
          '[Supabase] ⚠️ Warning migrating learned category map (non-blocking):',
          updateLearnedError
        )
      } else {
        console.log('[Supabase] ✅ Learned category map migrated')
      }
    }

    // 8. Validate migration before cleanup: confirm auth user actually received the data
    console.log('[Supabase] 🟡 Validando migración antes de limpiar datos del guest...')
    const { data: authMonths } = await supabase
      .from('monthly_records')
      .select('month', { count: 'exact' })
      .eq('user_id', newAuthenticatedUserId)

    const authHasData = (authMonths && authMonths.length > 0) || totalMigrated === 0

    if (!authHasData) {
      console.warn(
        '[Supabase] ⚠️ Validation failed: auth user has no monthly_records after migration. Aborting cleanup to preserve guest data.'
      )
      return {
        success: false,
        itemsMigrated: totalMigrated,
        error: 'Post-migration validation failed',
      }
    }

    // 9. DELETE guest data only after validation passes
    console.log('[Supabase] 🟡 Limpiando datos del guest (después de validación)...')
    try {
      await supabase.from('expenses').delete().eq('user_id', guestUserId)
      await supabase.from('extra_incomes').delete().eq('user_id', guestUserId)
      await supabase.from('monthly_records').delete().eq('user_id', guestUserId)
      await supabase.from('concept_map').delete().eq('user_id', guestUserId)
      await supabase.from('learned_category_map').delete().eq('user_id', guestUserId)
      await supabase.from('users').delete().eq('id', guestUserId)
      console.log('[Supabase] ✅ Datos del guest eliminados exitosamente')
    } catch (cleanupError) {
      console.warn(
        '[Supabase] ⚠️ Warning al limpiar datos del guest (no bloqueante):',
        cleanupError
      )
      // Non-blocking: orphaned guest records are harmless
    }

    console.log('[Supabase] 🟢 ✅ Guest→auth migration complete:', {
      itemsMigrated: totalMigrated,
    })

    return { success: true, itemsMigrated: totalMigrated }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Supabase] ❌ Migration failed:', errorMsg)
    return { success: false, itemsMigrated: 0, error: errorMsg }
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
 * Profile is stored as JSON in profile_data column (backward compatible)
 */
export async function saveProfileData(userId: string, profile: UserProfile): Promise<void> {
  console.log('[Supabase] 🔵 saveProfileData called:', {
    userId,
    profileData: {
      nombre: profile.nombre,
      telefono: profile.telefono,
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
    console.log(
      '[Supabase] 🟡 Validando que los datos se guardaron en Supabase para userId:',
      userId
    )
    const { data, error } = await supabase
      .from('users')
      .select('id, monthly_income, monthly_savings, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Supabase] ❌ Validación falló - usuario no encontrado en DB:', {
        error: error.message,
        code: error.code,
        userId,
      })
      return false
    }

    if (!data) {
      console.error('[Supabase] ❌ Validación falló - DB devolvió vacío')
      return false
    }

    console.log('[Supabase] 🟢 ✅ Validación exitosa - datos existen en Supabase:', {
      userId,
      updatedAt: data.updated_at,
      monthlyIncome: data.monthly_income,
    })
    return true
  } catch (e) {
    console.error('[Supabase] ❌ Validación error (exception):', e)
    return false
  }
}
