import { formatMoney } from './config'
import type { CountryConfig } from './config'
import type { Expense, MonthRecord, Pocket } from './types'
import type { FinancialSnapshot } from './financialEngine'

/**
 * Parse date string in DD/MM/YYYY or YYYY-MM-DD format
 * Returns a valid Date object or null if parsing fails
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    // Remove time part if present
    const datePart = dateStr.split('T')[0]

    if (datePart.includes('/')) {
      // DD/MM/YYYY format
      const [d, m, y] = datePart.split('/')
      return new Date(`${y}-${m}-${d}T12:00:00`)
    } else if (datePart.includes('-')) {
      // YYYY-MM-DD format
      return new Date(datePart + 'T12:00:00')
    }

    return null
  } catch {
    return null
  }
}

export type InsightKind = 'warning' | 'positive' | 'info'

export interface Insight {
  kind: InsightKind
  icon: string
  title: string
  body: string
  action: string
}

export interface InsightResult {
  primary: Insight | null
  secondary: Insight[]
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export function generateInsights(
  snapshot: FinancialSnapshot,
  expenses: Expense[],
  pockets: Pocket[],
  spentByPocket: Record<string, number>,
  monthlyHistory: Record<string, MonthRecord>,
  config: CountryConfig
): InsightResult {
  if (expenses.length === 0) return { primary: null, secondary: [] }

  const warnings: Insight[] = []
  const positives: Insight[] = []
  const infos: Insight[] = []

  // USAR SNAPSHOT COMO FUENTE DE VERDAD
  const totalSpent = snapshot.totalExpenses
  const monthlyBudget = snapshot.budget
  const monthlyIncome = snapshot.totalIncome
  const remaining = snapshot.remaining
  const status = snapshot.status

  // USAR SNAPSHOT PARA CÁLCULOS CLAVE
  const dailyAvg = snapshot.day > 0 ? totalSpent / snapshot.day : 0
  const projected = dailyAvg * snapshot.daysInMonth
  const timePct = snapshot.day / snapshot.daysInMonth

  const today = new Date()
  const daysInMonth = snapshot.daysInMonth
  const daysPassed = snapshot.day
  const daysLeft = daysInMonth - daysPassed
  const fm = (n: number) => formatMoney(n, config)

  const thisMonthKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()
  const lastMonthKey =
    Object.keys(monthlyHistory)
      .filter((k) => k < thisMonthKey)
      .sort()
      .reverse()[0] ?? null
  const lastMonth = lastMonthKey ? monthlyHistory[lastMonthKey] : null
  const lastMonthTotal = lastMonth
    ? (lastMonth.expenses?.reduce((s, e) => s + e.amount, 0) ?? 0)
    : 0

  // ── 0. Ahorro disponible (priority when income is set) ────────────────────
  if (monthlyIncome > 0 && daysPassed >= 3) {
    const availableSavings = monthlyIncome - totalSpent
    const availableRate = Math.round((availableSavings / monthlyIncome) * 100)
    const lastIncome = lastMonth?.income ?? 0
    const lastSavings = lastIncome > 0 ? lastIncome - lastMonthTotal : null

    if (availableSavings >= 0) {
      const vsLast =
        lastSavings != null && lastSavings > 0
          ? ` El mes pasado te quedaron libres ${fm(lastSavings)}.`
          : ''
      const daysLeft = daysInMonth - daysPassed
      const actionText =
        availableRate < 10
          ? `Reducir ${fm(Math.max(0, totalSpent * 0.1))} más llevaría tu ahorro al 10%.`
          : daysLeft > 0
            ? `Buen ritmo — quedan ${daysLeft} días para seguir sumando.`
            : `Cerraste el mes con ${availableRate}% de tus ingresos ahorrados.`
      const insight: Insight = {
        kind: availableRate >= 10 ? 'positive' : 'info',
        icon: '🏦',
        title: `Ahorro disponible: ${fm(availableSavings)} (${availableRate}%)`,
        body: `Gastaste ${fm(totalSpent)} de ${fm(monthlyIncome)} en ingresos totales.${vsLast}`,
        action: actionText,
      }
      if (insight.kind === 'positive') positives.push(insight)
      else infos.push(insight)
    } else {
      warnings.push({
        kind: 'warning',
        icon: '⚠️',
        title: `Déficit: gastaste ${fm(-availableSavings)} más que tus ingresos`,
        body: `Tus gastos (${fm(totalSpent)}) superaron tus ingresos totales (${fm(monthlyIncome)}).`,
        action: `Reduce a ${fm(monthlyIncome / daysInMonth)}/día para no superar tus ingresos.`,
      })
    }
  }

  // ── 1. Spending vs time (always relevant) ─────────────────────────────────
  if (monthlyBudget > 0) {
    const spentPct = totalSpent / monthlyBudget
    const overagePct = Math.round((spentPct - timePct) * 100)
    const remaining = monthlyBudget - totalSpent

    if (remaining < 0) {
      const dailyCut = daysLeft > 0 ? -remaining / daysLeft : 0
      const excessPct = Math.round((-remaining / monthlyBudget) * 100)
      warnings.push({
        kind: 'warning',
        icon: '🚨',
        title: `Presupuesto superado en ${fm(-remaining)}`,
        body: `Gastaste ${fm(totalSpent)} con un límite de ${fm(monthlyBudget)} — excediste tu presupuesto en ${excessPct}%.`,
        action: `Para no alejarte más, evita gastos no esenciales (ahorra ${fm(dailyCut)}/día).`,
      })
    } else if (overagePct > 10) {
      const dailyAllowance = remaining / Math.max(1, daysLeft)
      warnings.push({
        kind: 'warning',
        icon: '📊',
        title: `Vas ${overagePct}% por encima del ritmo ideal`,
        body: `Llevas el ${Math.round(timePct * 100)}% del mes y has gastado el ${Math.round(spentPct * 100)}% del presupuesto (${fm(totalSpent)} de ${fm(monthlyBudget)}).`,
        action: `Puedes gastar hasta ${fm(dailyAllowance)}/día los próximos ${daysLeft} días para cerrar en presupuesto.`,
      })
    } else if (overagePct <= 0) {
      const dailyAllowance = remaining / Math.max(1, daysLeft)
      positives.push({
        kind: 'positive',
        icon: '✅',
        title: `Vas alineado con tu presupuesto`,
        body: `Llevas el ${Math.round(timePct * 100)}% del mes y has gastado el ${Math.round(spentPct * 100)}% del presupuesto — ${fm(remaining)} disponibles.`,
        action: `Puedes gastar hasta ${fm(dailyAllowance)}/día y cerrar en presupuesto.`,
      })
    } else {
      // 0 < overagePct <= 10: ligeramente por encima del ritmo pero dentro de un margen razonable.
      // Antes esta franja no generaba ningún insight (vacío silencioso en la cobertura de reglas).
      const dailyAllowance = remaining / Math.max(1, daysLeft)
      infos.push({
        kind: 'info',
        icon: 'ℹ️',
        title: `Vas ${overagePct}% por encima del ritmo, dentro de un margen razonable`,
        body: `Llevas el ${Math.round(timePct * 100)}% del mes y has gastado el ${Math.round(spentPct * 100)}% del presupuesto (${fm(totalSpent)} de ${fm(monthlyBudget)}).`,
        action: `Puedes gastar hasta ${fm(dailyAllowance)}/día los próximos ${daysLeft} días para mantenerte en presupuesto.`,
      })
    }
  }

  // ── 2. Pocket over-budget ─────────────────────────────────────────────────
  const overPockets = [...pockets]
    .filter((p) => p.budget > 0 && (spentByPocket[p.id] ?? 0) > p.budget)
    .sort((a, b) => {
      const ovA = (spentByPocket[a.id] ?? 0) - a.budget
      const ovB = (spentByPocket[b.id] ?? 0) - b.budget
      return ovB - ovA
    })

  if (overPockets.length > 0) {
    const p = overPockets[0]
    const spent = spentByPocket[p.id] ?? 0
    const overBy = spent - p.budget
    const overPct = Math.round((overBy / p.budget) * 100)
    const lastCat = lastMonth
      ? (lastMonth.expenses ?? [])
          .filter((e) => e.pocketId === p.id)
          .reduce((s, e) => s + e.amount, 0)
      : null
    const vsLast =
      lastCat != null && lastCat > 0
        ? ` El mes pasado: ${fm(lastCat)} en ${p.name.toLowerCase()}.`
        : ''

    const budgetImpact =
      monthlyBudget > 0
        ? ` Esto deja ${fm(Math.max(0, monthlyBudget - totalSpent))} disponibles del presupuesto total.`
        : ''
    warnings.push({
      kind: 'warning',
      icon: '⚠️',
      title: `${p.name}: excedido en ${fm(overBy)} (+${overPct}%)`,
      body: `Gastaste ${fm(spent)} de un límite de ${fm(p.budget)}.${vsLast}${budgetImpact}`,
      action: `Pausa los gastos en ${p.name.toLowerCase()} — el exceso de ${fm(overBy)} ya impacta tu presupuesto total.`,
    })
  }

  // ── 3. Top category insight ───────────────────────────────────────────────
  const sortedPockets = [...pockets]
    .filter((p) => (spentByPocket[p.id] ?? 0) > 0)
    .sort((a, b) => (spentByPocket[b.id] ?? 0) - (spentByPocket[a.id] ?? 0))

  if (sortedPockets.length > 0) {
    const top = sortedPockets[0]
    const topSpent = spentByPocket[top.id] ?? 0
    const sharePct = Math.round((topSpent / totalSpent) * 100)
    const topProj = daysPassed > 0 ? (topSpent / daysPassed) * daysInMonth : topSpent
    const lastCat = lastMonth
      ? (lastMonth.expenses ?? [])
          .filter((e) => e.pocketId === top.id)
          .reduce((s, e) => s + e.amount, 0)
      : null

    if (lastCat != null && lastCat > 0) {
      const diff = topSpent - lastCat
      const pct = Math.round(Math.abs(diff / lastCat) * 100) as number
      ;(diff > 0 && pct > 20 ? warnings : infos).push({
        kind: diff > 0 && pct > 20 ? 'warning' : 'info',
        icon: '🎯',
        title: `${top.name}: ${fm(topSpent)} (${diff > 0 ? '+' : '-'}${pct}% vs. mes pasado)`,
        body: `Mes pasado: ${fm(lastCat)}. Proyección al cierre: ${fm(topProj)}. Representa el ${sharePct}% de tu gasto total.`,
        action:
          diff > 0
            ? `Reducir ${fm(Math.round(topSpent / daysPassed) * 7)} por semana en ${top.name.toLowerCase()} ahorraría ${fm(diff)} respecto al mes pasado.`
            : `Buen control en ${top.name.toLowerCase()} — ${fm(Math.abs(diff))} menos que el mes pasado.`,
      })
    } else if (sharePct >= 45 && sortedPockets.length >= 2) {
      infos.push({
        kind: 'info',
        icon: '🎯',
        title: `${top.name} concentra el ${sharePct}% del gasto total`,
        body: `Gastaste ${fm(topSpent)} en ${top.name.toLowerCase()}. Proyección al cierre: ${fm(topProj)}.`,
        action:
          top.budget > 0 && top.budget - topSpent > 0
            ? `Quedan ${fm(top.budget - topSpent)} disponibles en este bolsillo.`
            : `Revisa si el gasto en ${top.name.toLowerCase()} está dentro de lo esperado.`,
      })
    }
  }

  // ── 4. Week-over-week ─────────────────────────────────────────────────────
  if (daysPassed >= 4) {
    const now = today.getTime()
    const ms7 = 7 * 86_400_000
    const thisWeek = expenses.filter((e) => now - new Date(e.date).getTime() < ms7)
    const prevWeek = expenses.filter((e) => {
      const age = now - new Date(e.date).getTime()
      return age >= ms7 && age < 2 * ms7
    })
    const prevFromHistory: Expense[] =
      daysPassed < 11 && lastMonth?.expenses
        ? lastMonth.expenses.filter((e) => {
            const age = now - new Date(e.date).getTime()
            return age >= ms7 && age < 2 * ms7
          })
        : []
    const allPrev = [...prevWeek, ...prevFromHistory]
    const thisTotal = thisWeek.reduce((s, e) => s + e.amount, 0)
    const prevTotal = allPrev.reduce((s, e) => s + e.amount, 0)

    if (thisTotal > 0 && prevTotal > 0) {
      const diff = thisTotal - prevTotal
      const pct = Math.round(Math.abs(diff / prevTotal) * 100)
      const higher = diff > 0

      if (pct >= 10) {
        const weeklyBudget = monthlyBudget > 0 ? monthlyBudget / (daysInMonth / 7) : null
        let vsWeekBudget = ''
        if (weeklyBudget != null) {
          vsWeekBudget = ` Tu objetivo semanal: ${fm(weeklyBudget)}.`
        }
        ;(higher ? warnings : positives).push({
          kind: higher ? 'warning' : 'positive',
          icon: higher ? '📈' : '📉',
          title: `Esta semana: ${fm(thisTotal)} (${higher ? '+' : '-'}${pct}% vs. semana anterior)`,
          body: `Semana anterior: ${fm(prevTotal)}. Diferencia: ${higher ? '+' : '-'}${fm(Math.abs(diff))}.${vsWeekBudget}`,
          action: higher
            ? `Si mantienes este ritmo 4 semanas, gastarás ${fm(diff * 4)} más que el mes anterior.`
            : `Mantener este ritmo ahorraría ${fm(Math.abs(diff) * 4)} al mes comparado con la semana anterior.`,
        })
      }
    }
  }

  // ── 5. Projection vs last month close ────────────────────────────────────
  if (daysPassed >= 5) {
    if (lastMonthTotal > 0) {
      const diff = projected - lastMonthTotal
      const pct = Math.round(Math.abs(diff / lastMonthTotal) * 100)
      if (pct >= 5) {
        ;(diff > 0 ? warnings : positives).push({
          kind: diff > 0 ? 'warning' : 'positive',
          icon: '📅',
          title: `Proyección al cierre: ${fm(projected)} (${diff > 0 ? '+' : '-'}${pct}% vs. mes pasado)`,
          body: `Al ritmo de ${fm(dailyAvg)}/día cerrarás en ${fm(projected)}. Mes pasado cerraste en ${fm(lastMonthTotal)}.`,
          action:
            diff > 0
              ? `Reduce ${fm(dailyAvg - lastMonthTotal / daysInMonth)}/día para cerrar similar al mes pasado.`
              : `Vas ${pct}% más eficiente — buen ritmo.`,
        })
      }
    } else if (monthlyBudget > 0) {
      const diff = projected - monthlyBudget
      if (Math.abs(diff) / monthlyBudget >= 0.05) {
        ;(diff > 0 ? warnings : positives).push({
          kind: diff > 0 ? 'warning' : 'positive',
          icon: '📅',
          title: `Proyección al cierre: ${fm(projected)}`,
          body: `Al ritmo de ${fm(dailyAvg)}/día, ${diff > 0 ? 'superarías' : 'cerrarías por debajo de'} el presupuesto en ${fm(Math.abs(diff))}.`,
          action:
            diff > 0
              ? `Reduce a ${fm(monthlyBudget / daysInMonth)}/día para cerrar en presupuesto.`
              : `Tienes ${fm(-diff)} de margen proyectado.`,
        })
      }
    }
  }

  // ── 6. Weekend vs weekday pattern ─────────────────────────────────────────
  if (daysPassed >= 7) {
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
    const wkendExp = expenses.filter((e) => isWeekend(new Date(e.date)))
    const wkdayExp = expenses.filter((e) => !isWeekend(new Date(e.date)))
    const uniqueDates = new Set(expenses.map((e) => e.date.slice(0, 10)))
    const wkendDays = [...uniqueDates].filter((d) => isWeekend(new Date(d))).length
    const wkdayDays = [...uniqueDates].filter((d) => !isWeekend(new Date(d))).length

    if (wkendDays >= 2 && wkdayDays >= 2) {
      const wkendAvg = wkendExp.reduce((s, e) => s + e.amount, 0) / wkendDays
      const wkdayAvg = wkdayExp.reduce((s, e) => s + e.amount, 0) / wkdayDays
      const ratio = wkendAvg / wkdayAvg

      if (ratio >= 1.5) {
        const extraPerWeek = (wkendAvg - wkdayAvg) * 2
        infos.push({
          kind: 'info',
          icon: '📅',
          title: `Gastas ${ratio.toFixed(1)}x más los fines de semana`,
          body: `Promedio: ${fm(wkendAvg)}/día en fin de semana vs ${fm(wkdayAvg)}/día entre semana.`,
          action: `Reducir ${fm(extraPerWeek / 2)}/día los fines de semana ahorraría ${fm(extraPerWeek * 4)}/mes.`,
        })
      }
    }
  }

  // ── 7. Month acceleration ─────────────────────────────────────────────────
  if (daysPassed >= 10) {
    const half = Math.floor(daysPassed / 2)
    const firstHalf = expenses.filter((e) => new Date(e.date).getDate() <= half)
    const secondHalf = expenses.filter((e) => new Date(e.date).getDate() > half)
    const firstAvg = firstHalf.reduce((s, e) => s + e.amount, 0) / half
    const secondAvg = secondHalf.reduce((s, e) => s + e.amount, 0) / (daysPassed - half)

    if (secondAvg > firstAvg * 1.4 && firstAvg > 0) {
      const accelPct = Math.round((secondAvg / firstAvg - 1) * 100)
      warnings.push({
        kind: 'warning',
        icon: '📈',
        title: `Tu ritmo de gasto aumentó ${accelPct}% a mitad de mes`,
        body: `Primera mitad: ${fm(firstAvg)}/día. Segunda mitad: ${fm(secondAvg)}/día.`,
        action: `Revisa qué cambió — puede ser una compra grande o un cambio de hábito.`,
      })
    }
  }

  // ── 8. Recurring habit ────────────────────────────────────────────────────
  if (expenses.length >= 4) {
    const freq: Record<string, { count: number; total: number }> = {}
    for (const e of expenses) {
      const k = e.concept.toLowerCase()
      if (!freq[k]) freq[k] = { count: 0, total: 0 }
      freq[k].count++
      freq[k].total += e.amount
    }
    const topHabit = Object.entries(freq).sort(([, a], [, b]) => b.count - a.count)[0]
    if (topHabit && topHabit[1].count >= 3) {
      const [concept, { count, total }] = topHabit
      const avgPer = total / count
      const projMonthly = daysPassed > 0 ? (total / daysPassed) * daysInMonth : total
      const lastHabit = lastMonth
        ? (lastMonth.expenses ?? [])
            .filter((e) => e.concept.toLowerCase() === concept)
            .reduce((s, e) => s + e.amount, 0)
        : null
      const vsLast =
        lastHabit != null && lastHabit > 0
          ? ` Mes pasado: ${fm(lastHabit)} (${lastMonth!.expenses!.filter((e) => e.concept.toLowerCase() === concept).length} veces).`
          : ''

      infos.push({
        kind: 'info',
        icon: '🔁',
        title: `"${concept}" × ${count}: ${fm(total)} este mes`,
        body: `${fm(avgPer)} por registro. Proyección al cierre: ${fm(projMonthly)}.${vsLast}`,
        action: `Representa el ${Math.round((total / totalSpent) * 100)}% de tu gasto total del mes.`,
      })
    }
  }

  // Priorizar: warnings (exceso, riesgo) > positives (ahorro) > infos
  void status
  let primary: Insight | null = null
  let secondary: Insight[] = []

  if (warnings.length > 0) {
    primary = warnings[0]
    secondary = [...warnings.slice(1), ...positives, ...infos].slice(0, 2)
  } else if (positives.length > 0) {
    primary = positives[0]
    secondary = [...positives.slice(1), ...infos].slice(0, 2)
  } else if (infos.length > 0) {
    primary = infos[0]
    secondary = infos.slice(1, 3)
  }

  return { primary, secondary }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export interface HistorialMonth {
  key: string
  name: string
  totalSpent: number
  budget: number
  income: number
  savings: number
  savingsRate: number | null
  topCategory: string | null
  vsLast: number | null // % vs previous month in the list
  isBest: boolean
}

export function buildHistorial(
  monthlyHistory: Record<string, MonthRecord>,
  pockets: Pocket[],
  config: CountryConfig
): { months: HistorialMonth[]; trendMsg: string | null } {
  const sorted = Object.entries(monthlyHistory)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)

  if (sorted.length === 0) return { months: [], trendMsg: null }

  const processed = sorted.map(([key, rec]) => {
    // Parse month from DD/MM/Y or YYYY-MM format
    let year: number
    let month: number
    if (key.includes('-')) {
      const [y, m] = key.split('-')
      year = parseInt(y)
      month = parseInt(m)
    } else if (key.includes('/')) {
      const parts = key.split('/')
      let y = parseInt(parts[2])
      // Handle short year format (e.g., "2" from "2026")
      if (y < 100) {
        if (y < 10) {
          // Single digit: assume 202X (for years 2020-2029)
          y = 2020 + y
        } else {
          // 2 digits: assume 20XX for 00-50, 19XX for 50-99
          y = y <= 50 ? 2000 + y : 1900 + y
        }
      }
      month = parseInt(parts[1])
      year = y
    } else {
      // Fallback
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth() + 1
    }
    const monthName = new Date(year, month - 1, 15).toLocaleDateString(config.locale, {
      month: 'long',
    })
    const name =
      monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase() + ` de ${year}`
    const income = rec.income ?? 0
    const recSavings = rec.savings ?? 0
    const budget = Math.max(0, income - recSavings)
    const totalSpent = (rec.expenses ?? []).reduce((s, e) => s + e.amount, 0)
    const savings = income > 0 ? income - totalSpent : 0
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : null

    // derive top category from stored expenses
    const catAcc: Record<string, number> = {}
    for (const e of rec.expenses ?? []) catAcc[e.pocketId] = (catAcc[e.pocketId] || 0) + e.amount
    const topId = Object.entries(catAcc).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
    const topCat = topId ? (pockets.find((p) => p.id === topId)?.name ?? null) : null

    return {
      key,
      name,
      totalSpent,
      budget,
      income,
      savings,
      savingsRate,
      topCategory: topCat,
      vsLast: null as number | null,
      isBest: false,
    }
  })

  // compute vs previous
  for (let i = 0; i < processed.length; i++) {
    const prev = processed[i + 1]
    if (prev && prev.totalSpent > 0) {
      processed[i].vsLast = Math.round(
        ((processed[i].totalSpent - prev.totalSpent) / prev.totalSpent) * 100
      )
    }
  }

  // best savings month
  const savingMonths = processed.filter((m) => m.savingsRate !== null && m.savingsRate > 0)
  if (savingMonths.length > 0) {
    const best = savingMonths.sort((a, b) => (b.savingsRate ?? 0) - (a.savingsRate ?? 0))[0]
    best.isBest = true
  }

  // trend message
  let trendMsg: string | null = null
  const fm = (n: number) => formatMoney(n, config)
  if (processed.length >= 3) {
    const [m0, m1, m2] = processed
    if (m0.totalSpent > m1.totalSpent && m1.totalSpent > m2.totalSpent) {
      trendMsg = 'Tus gastos han aumentado 3 meses seguidos. Revisa qué lo está empujando.'
    } else if (m0.totalSpent < m1.totalSpent && m1.totalSpent < m2.totalSpent) {
      trendMsg = 'Llevas 3 meses reduciendo gastos — muy buen ritmo.'
    } else if (m0.vsLast !== null) {
      const p = m0.vsLast
      trendMsg =
        p > 0
          ? `Gastaste ${p}% más que el mes pasado (${fm(m0.totalSpent - m1.totalSpent)} de diferencia).`
          : p < 0
            ? `Gastaste ${Math.abs(p)}% menos que el mes pasado — ${fm(m1.totalSpent - m0.totalSpent)} de ahorro adicional.`
            : null
    }
  } else if (processed.length === 2 && processed[0].vsLast !== null) {
    const p = processed[0].vsLast
    const diff = Math.abs(processed[0].totalSpent - processed[1].totalSpent)
    trendMsg =
      p > 0
        ? `Gastaste ${p}% más que el mes pasado (+${fm(diff)}).`
        : `Gastaste ${Math.abs(p)}% menos que el mes pasado (−${fm(diff)}).`
  }

  return { months: processed, trendMsg }
}
