'use client'

import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { InsightDonut } from '../components/InsightDonut'
import { DS, formatMoney, maskMoney, getPocketPalette, getPocketIcon, POCKET_PALETTE } from '../lib/config'
import type { CountryConfig } from '../lib/config'
import type { Expense, MonthRecord, Pocket } from '../lib/types'

interface Props {
  expenses: Expense[]
  pockets: Pocket[]
  spentByPocket: Record<string, number>
  monthlyBudget: number
  monthlyIncome: number
  monthlyHistory: Record<string, MonthRecord>
  config: CountryConfig
  isPrivacyMode?: boolean
}

type InsightKind = 'warning' | 'positive' | 'info'

interface Insight {
  kind: InsightKind
  icon: string
  title: string
  body: string
  action: string
}

interface InsightResult {
  primary: Insight | null
  secondary: Insight[]
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function generateInsights(
  expenses: Expense[],
  pockets: Pocket[],
  spentByPocket: Record<string, number>,
  monthlyBudget: number,
  monthlyIncome: number,
  monthlyHistory: Record<string, MonthRecord>,
  config: CountryConfig,
): InsightResult {
  if (expenses.length === 0) return { primary: null, secondary: [] }

  const warnings: Insight[] = []
  const positives: Insight[] = []
  const infos: Insight[] = []
  const totalSpent  = expenses.reduce((s, e) => s + e.amount, 0)
  const today       = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysPassed  = today.getDate()
  const daysLeft    = daysInMonth - daysPassed
  const dailyAvg    = daysPassed > 0 ? totalSpent / daysPassed : 0
  const projected   = dailyAvg * daysInMonth
  const timePct     = daysPassed / daysInMonth
  const fm          = (n: number) => formatMoney(n, config)

  const lastMonthKey   = Object.keys(monthlyHistory).sort().reverse()[0] ?? null
  const lastMonth      = lastMonthKey ? monthlyHistory[lastMonthKey] : null
  const lastMonthTotal = lastMonth?.totalSpent ?? 0

  // ── 0. Savings rate (priority when income is set) ─────────────────────────
  if (monthlyIncome > 0 && daysPassed >= 3) {
    const projSavings   = monthlyIncome - projected
    const plannedSavings = monthlyBudget > 0 ? monthlyIncome - monthlyBudget : null
    // Primary savings number: budget-based (planned) when budget is set; otherwise projection
    const primarySavings = plannedSavings !== null ? plannedSavings : projSavings
    const primaryRate    = Math.round((primarySavings / monthlyIncome) * 100)
    const projRate       = Math.round((projSavings / monthlyIncome) * 100)
    const lastIncome     = lastMonth?.income ?? 0
    const lastSavings    = lastIncome > 0 ? lastIncome - lastMonthTotal : null

    if (primarySavings >= 0) {
      const vsLast = lastSavings != null && lastSavings > 0
        ? ` El mes pasado ahorraste ${fm(lastSavings)}.`
        : ''
      const actionText = plannedSavings !== null
        ? projRate !== primaryRate
          ? `A tu ritmo actual proyectas ahorrar ${fm(projSavings)} (${projRate}%). ${projRate >= primaryRate ? 'Vas por encima del plan.' : 'Reduce gastos para alcanzar el plan.'}`
          : `Mantén el gasto dentro del presupuesto para asegurar este ahorro.`
        : (primaryRate < 10
            ? `Reducir ${fm(Math.max(0, projected * 0.1 - primarySavings))} más llevaría tu ahorro al 10%.`
            : `Mantén el gasto por debajo de ${fm(dailyAvg)}/día para cerrar con este ahorro.`)
      const insight: Insight = {
        kind: primaryRate >= 10 ? 'positive' : 'info',
        icon: '🏦',
        title: `${plannedSavings !== null ? 'Ahorro planeado' : 'Ahorro proyectado'}: ${fm(primarySavings)} (${primaryRate}%)`,
        body: plannedSavings !== null
          ? `Si gastas el presupuesto completo (${fm(monthlyBudget)}), ahorras ${fm(primarySavings)} de ${fm(monthlyIncome)}.${vsLast}`
          : `Al ritmo de ${fm(dailyAvg)}/día gastarás ${fm(projected)} de ${fm(monthlyIncome)}.${vsLast}`,
        action: actionText,
      }
      if (insight.kind === 'positive') positives.push(insight)
      else infos.push(insight)
    } else {
      warnings.push({
        kind: 'warning',
        icon: '⚠️',
        title: plannedSavings !== null
          ? `El presupuesto supera tus ingresos en ${fm(-primarySavings)}`
          : `Proyección: gastarás ${fm(-primarySavings)} más de lo que recibes`,
        body: plannedSavings !== null
          ? `Tu presupuesto (${fm(monthlyBudget)}) supera tus ingresos (${fm(monthlyIncome)}). Reduce el presupuesto para ahorrar.`
          : `Al ritmo de ${fm(dailyAvg)}/día, el gasto proyectado (${fm(projected)}) supera tus ingresos (${fm(monthlyIncome)}).`,
        action: `Reduce a ${fm(monthlyIncome / daysInMonth)}/día para no superar tus ingresos.`,
      })
    }
  }

  // ── 1. Spending vs time (always relevant) ─────────────────────────────────
  if (monthlyBudget > 0) {
    const spentPct  = totalSpent / monthlyBudget
    const overagePct = Math.round((spentPct - timePct) * 100)
    const remaining  = monthlyBudget - totalSpent

    if (remaining < 0) {
      const dailyCut = daysLeft > 0 ? (-remaining) / daysLeft : 0
      warnings.push({
        kind: 'warning',
        icon: '🚨',
        title: `Presupuesto superado en ${fm(-remaining)}`,
        body: `Gastaste ${fm(totalSpent)} con un límite de ${fm(monthlyBudget)} — ${Math.round(spentPct * 100)}% del presupuesto.`,
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
    }
  }

  // ── 2. Pocket over-budget ─────────────────────────────────────────────────
  const overPockets = [...pockets]
    .filter(p => p.budget > 0 && (spentByPocket[p.id] ?? 0) > p.budget)
    .sort((a, b) => {
      const ovA = (spentByPocket[a.id] ?? 0) - a.budget
      const ovB = (spentByPocket[b.id] ?? 0) - b.budget
      return ovB - ovA
    })

  if (overPockets.length > 0) {
    const p       = overPockets[0]
    const spent   = spentByPocket[p.id] ?? 0
    const overBy  = spent - p.budget
    const overPct = Math.round((overBy / p.budget) * 100)
    const lastCat = lastMonth
      ? (lastMonth.expenses ?? []).filter(e => e.pocketId === p.id).reduce((s, e) => s + e.amount, 0)
      : null
    const vsLast = lastCat != null && lastCat > 0
      ? ` El mes pasado: ${fm(lastCat)} en ${p.name.toLowerCase()}.`
      : ''

    const budgetImpact = monthlyBudget > 0
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
    .filter(p => (spentByPocket[p.id] ?? 0) > 0)
    .sort((a, b) => (spentByPocket[b.id] ?? 0) - (spentByPocket[a.id] ?? 0))

  if (sortedPockets.length > 0) {
    const top      = sortedPockets[0]
    const topSpent = spentByPocket[top.id] ?? 0
    const sharePct = Math.round((topSpent / totalSpent) * 100)
    const topProj  = daysPassed > 0 ? (topSpent / daysPassed) * daysInMonth : topSpent
    const lastCat  = lastMonth
      ? (lastMonth.expenses ?? []).filter(e => e.pocketId === top.id).reduce((s, e) => s + e.amount, 0)
      : null

    if (lastCat != null && lastCat > 0) {
      const diff = topSpent - lastCat
      const pct = Math.round(Math.abs(diff / lastCat) * 100) as number
      (diff > 0 && pct > 20 ? warnings : infos).push({
        kind: diff > 0 && pct > 20 ? 'warning' : 'info',
        icon: '🎯',
        title: `${top.name}: ${fm(topSpent)} (${diff > 0 ? '+' : '-'}${pct}% vs. mes pasado)`,
        body: `Mes pasado: ${fm(lastCat)}. Proyección al cierre: ${fm(topProj)}. Representa el ${sharePct}% de tu gasto total.`,
        action: diff > 0
          ? `Reducir ${fm(Math.round(topSpent / daysPassed) * 7)} por semana en ${top.name.toLowerCase()} ahorraría ${fm(diff)} respecto al mes pasado.`
          : `Buen control en ${top.name.toLowerCase()} — ${fm(Math.abs(diff))} menos que el mes pasado.`,
      })
    } else if (sharePct >= 45 && sortedPockets.length >= 2) {
      infos.push({
        kind: 'info',
        icon: '🎯',
        title: `${top.name} concentra el ${sharePct}% del gasto total`,
        body: `Gastaste ${fm(topSpent)} en ${top.name.toLowerCase()}. Proyección al cierre: ${fm(topProj)}.`,
        action: top.budget > 0 && top.budget - topSpent > 0
          ? `Quedan ${fm(top.budget - topSpent)} disponibles en este bolsillo.`
          : `Revisa si el gasto en ${top.name.toLowerCase()} está dentro de lo esperado.`,
      })
    }
  }

  // ── 4. Week-over-week ─────────────────────────────────────────────────────
  if (daysPassed >= 4) {
    const now  = today.getTime()
    const ms7  = 7 * 86_400_000
    const thisWeek = expenses.filter(e => now - new Date(e.date).getTime() < ms7)
    const prevWeek = expenses.filter(e => {
      const age = now - new Date(e.date).getTime()
      return age >= ms7 && age < 2 * ms7
    })
    const prevFromHistory: Expense[] = daysPassed < 11 && lastMonth?.expenses
      ? lastMonth.expenses.filter(e => {
          const age = now - new Date(e.date).getTime()
          return age >= ms7 && age < 2 * ms7
        })
      : []
    const allPrev    = [...prevWeek, ...prevFromHistory]
    const thisTotal  = thisWeek.reduce((s, e) => s + e.amount, 0)
    const prevTotal  = allPrev.reduce((s, e) => s + e.amount, 0)

    if (thisTotal > 0 && prevTotal > 0) {
      const diff    = thisTotal - prevTotal
      const pct     = Math.round(Math.abs(diff / prevTotal) * 100)
      const higher  = diff > 0

      if (pct >= 10) {
        const weeklyBudget = monthlyBudget > 0 ? monthlyBudget / (daysInMonth / 7) : null
        const vsWeekBudget: string = weeklyBudget ? ` Tu objetivo semanal: ${fm(weeklyBudget)}.` : ''
        (higher ? warnings : positives).push({
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
  if (daysPassed >= 5 && pool.length < 3) {
    if (lastMonthTotal > 0) {
      const diff = projected - lastMonthTotal
      const pct  = Math.round(Math.abs(diff / lastMonthTotal) * 100)
      if (pct >= 5) {
        (diff > 0 ? warnings : positives).push({
          kind: diff > 0 ? 'warning' : 'positive',
          icon: '📅',
          title: `Proyección al cierre: ${fm(projected)} (${diff > 0 ? '+' : '-'}${pct}% vs. mes pasado)`,
          body: `Al ritmo de ${fm(dailyAvg)}/día cerrarás en ${fm(projected)}. Mes pasado cerraste en ${fm(lastMonthTotal)}.`,
          action: diff > 0
            ? `Reduce ${fm(dailyAvg - lastMonthTotal / daysInMonth)}/día para cerrar similar al mes pasado.`
            : `Vas ${pct}% más eficiente — buen ritmo.`,
        })
      }
    } else if (monthlyBudget > 0) {
      const diff = projected - monthlyBudget
      if (Math.abs(diff) / monthlyBudget >= 0.05) {
        (diff > 0 ? warnings : positives).push({
          kind: diff > 0 ? 'warning' : 'positive',
          icon: '📅',
          title: `Proyección al cierre: ${fm(projected)}`,
          body: `Al ritmo de ${fm(dailyAvg)}/día, ${diff > 0 ? 'superarías' : 'cerrarías por debajo de'} el presupuesto en ${fm(Math.abs(diff))}.`,
          action: diff > 0
            ? `Reduce a ${fm(monthlyBudget / daysInMonth)}/día para cerrar en presupuesto.`
            : `Tienes ${fm(-diff)} de margen proyectado.`,
        })
      }
    }
  }

  // ── 6. Weekend vs weekday pattern ─────────────────────────────────────────
  if (daysPassed >= 7 && pool.length < 4) {
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
    const wkendExp  = expenses.filter(e => isWeekend(new Date(e.date)))
    const wkdayExp  = expenses.filter(e => !isWeekend(new Date(e.date)))
    const uniqueDates = new Set(expenses.map(e => e.date.slice(0, 10)))
    const wkendDays = [...uniqueDates].filter(d => isWeekend(new Date(d))).length
    const wkdayDays = [...uniqueDates].filter(d => !isWeekend(new Date(d))).length

    if (wkendDays >= 2 && wkdayDays >= 2) {
      const wkendAvg = wkendExp.reduce((s, e) => s + e.amount, 0) / wkendDays
      const wkdayAvg = wkdayExp.reduce((s, e) => s + e.amount, 0) / wkdayDays
      const ratio    = wkendAvg / wkdayAvg

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
  if (daysPassed >= 10 && pool.length < 4) {
    const half       = Math.floor(daysPassed / 2)
    const firstHalf  = expenses.filter(e => new Date(e.date).getDate() <= half)
    const secondHalf = expenses.filter(e => new Date(e.date).getDate() > half)
    const firstAvg   = firstHalf.reduce((s, e) => s + e.amount, 0) / half
    const secondAvg  = secondHalf.reduce((s, e) => s + e.amount, 0) / (daysPassed - half)

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
  if (expenses.length >= 4 && pool.length < 4) {
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
      const avgPer      = total / count
      const projMonthly = daysPassed > 0 ? (total / daysPassed) * daysInMonth : total
      const lastHabit   = lastMonth
        ? (lastMonth.expenses ?? []).filter(e => e.concept.toLowerCase() === concept).reduce((s, e) => s + e.amount, 0)
        : null
      const vsLast = lastHabit != null && lastHabit > 0
        ? ` Mes pasado: ${fm(lastHabit)} (${lastMonth!.expenses!.filter(e => e.concept.toLowerCase() === concept).length} veces).`
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
  const allInsights = [...warnings, ...positives, ...infos]

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
// KIND STYLES
// ─────────────────────────────────────────────────────────────────────────────
const KIND_STYLE: Record<InsightKind, { border: string; bg: string; action: string }> = {
  warning:  { border: '#EF4444', bg: '#FFF5F5', action: '#B91C1C' },
  positive: { border: '#22C55E', bg: '#F0FDF4', action: '#15803D' },
  info:     { border: '#0EA5E9', bg: '#F0F9FF', action: '#0369A1' },
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
interface HistorialMonth {
  key: string
  name: string
  totalSpent: number
  budget: number
  income: number
  savings: number
  savingsRate: number | null
  topCategory: string | null
  vsLast: number | null        // % vs previous month in the list
  isBest: boolean
}

function buildHistorial(
  monthlyHistory: Record<string, MonthRecord>,
  pockets: Pocket[],
  config: CountryConfig,
): { months: HistorialMonth[]; trendMsg: string | null } {
  const sorted = Object.entries(monthlyHistory)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)

  if (sorted.length === 0) return { months: [], trendMsg: null }

  const processed = sorted.map(([key, rec]) => {
    const [y, m] = key.split('-')
    const name = new Date(`${y}-${m}-15`).toLocaleDateString(config.locale, {
      month: 'long', year: '2-digit',
    })
    const income   = rec.income ?? 0
    const savings  = income > 0 ? income - rec.totalSpent : 0
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : null

    // derive top category from stored expenses
    const catAcc: Record<string, number> = {}
    for (const e of rec.expenses ?? []) catAcc[e.pocketId] = (catAcc[e.pocketId] || 0) + e.amount
    const topId  = Object.entries(catAcc).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
    const topCat = topId ? (pockets.find(p => p.id === topId)?.name ?? null) : null

    return { key, name, totalSpent: rec.totalSpent, budget: rec.budget, income, savings, savingsRate, topCategory: topCat, vsLast: null as number | null, isBest: false }
  })

  // compute vs previous
  for (let i = 0; i < processed.length; i++) {
    const prev = processed[i + 1]
    if (prev && prev.totalSpent > 0) {
      processed[i].vsLast = Math.round(((processed[i].totalSpent - prev.totalSpent) / prev.totalSpent) * 100)
    }
  }

  // best savings month
  const savingMonths = processed.filter(m => m.savingsRate !== null && m.savingsRate > 0)
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
      trendMsg = p > 0
        ? `Gastaste ${p}% más que el mes pasado (${fm(m0.totalSpent - m1.totalSpent)} de diferencia).`
        : p < 0
          ? `Gastaste ${Math.abs(p)}% menos que el mes pasado — ${fm(m1.totalSpent - m0.totalSpent)} de ahorro adicional.`
          : null
    }
  } else if (processed.length === 2 && processed[0].vsLast !== null) {
    const p = processed[0].vsLast
    const diff = Math.abs(processed[0].totalSpent - processed[1].totalSpent)
    trendMsg = p > 0
      ? `Gastaste ${p}% más que el mes pasado (+${fm(diff)}).`
      : `Gastaste ${Math.abs(p)}% menos que el mes pasado (−${fm(diff)}).`
  }

  return { months: processed, trendMsg }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function InsightsScreen({
  expenses,
  pockets,
  spentByPocket,
  monthlyBudget,
  monthlyIncome,
  monthlyHistory,
  config,
  isPrivacyMode = false,
}: Props) {
  const mm = (n: number) => maskMoney(n, config, isPrivacyMode)
  const [expandedPocket, setExpandedPocket] = useState<string | null>(null)

  const totalSpentRaw = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

  // Use spentByPocket sum as the base for category percentages so they always sum to 100%
  // (spentByPocket only counts expenses assigned to existing pockets)
  const totalSpent = useMemo(
    () => Object.values(spentByPocket).reduce((s, v) => s + v, 0) || totalSpentRaw,
    [spentByPocket, totalSpentRaw],
  )

  const byPocket = useMemo(
    () =>
      pockets
        .map((p, i) => ({ ...p, spent: spentByPocket[p.id] ?? 0, palIdx: i }))
        .filter(p => p.spent > 0)
        .sort((a, b) => b.spent - a.spent),
    [pockets, spentByPocket],
  )

  const byConcept = useMemo(
    () =>
      Object.entries(
        expenses.reduce((acc, e) => {
          const k = e.concept.toLowerCase()
          acc[k] = (acc[k] || 0) + e.amount
          return acc
        }, {} as Record<string, number>),
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8),
    [expenses],
  )

  const donutSegments = useMemo(
    () =>
      byPocket.map(p => {
        const pal = getPocketPalette(p.id, p.palIdx)
        return { name: p.name, value: p.spent, color: pal.bar }
      }),
    [byPocket],
  )

  const { primary: primaryInsight, secondary: secondaryInsights } = useMemo(
    () => generateInsights(expenses, pockets, spentByPocket, monthlyBudget, monthlyIncome, monthlyHistory, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, pockets, spentByPocket, monthlyBudget, monthlyIncome, monthlyHistory, config],
  )

  const { months: historialMonths, trendMsg } = useMemo(
    () => buildHistorial(monthlyHistory, pockets, config),
    [monthlyHistory, pockets, config],
  )

  return (
    <div className="pb-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400 mb-1">
          Análisis
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Insights</h1>
        {expenses.length > 0 && (
          <p className="text-sm text-slate-500 mt-0.5">
            {expenses.length} movimientos · {mm(totalSpentRaw)}
          </p>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="px-4 pt-6">
          <Card className="p-12 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl select-none"
              style={{ background: DS.primaryGrad }}
            >
              📊
            </div>
            <p className="text-slate-500 text-sm">
              Registra gastos para ver tus insights
            </p>
          </Card>
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-6">

          {/* ── Insight cards ─────────────────────────────────────────────── */}
          {primaryInsight && (
            <div>
              <SectionHeader>Este mes</SectionHeader>

              {/* Primary insight — destacado */}
              {(() => {
                const s = KIND_STYLE[primaryInsight.kind]
                return (
                  <div
                    className="rounded-2xl overflow-hidden flex mb-3"
                    style={{
                      background: s.bg,
                      border: `2px solid ${s.border}`,
                      boxShadow: '0 4px 12px rgba(15,23,42,.12)',
                    }}
                  >
                    <div className="w-1.5 shrink-0" style={{ background: s.border }} />
                    <div className="flex-1 px-5 py-4">
                      <div className="flex items-start gap-2.5 mb-2">
                        <span className="text-2xl leading-none mt-0.5 shrink-0">{primaryInsight.icon}</span>
                        <p className="text-base font-bold text-slate-900 leading-snug">{primaryInsight.title}</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3 pl-8">{primaryInsight.body}</p>
                      <p className="text-sm font-semibold leading-snug pl-8" style={{ color: s.action }}>
                        → {primaryInsight.action}
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Secondary insights — compactos */}
              {secondaryInsights.length > 0 && (
                <div className="space-y-2">
                  {secondaryInsights.map((ins, i) => {
                    const s = KIND_STYLE[ins.kind]
                    return (
                      <div
                        key={i}
                        className="rounded-2xl overflow-hidden flex"
                        style={{
                          background: s.bg,
                          border: `1px solid ${s.border}22`,
                          boxShadow: '0 1px 4px rgba(15,23,42,.06)',
                        }}
                      >
                        <div className="w-1 shrink-0" style={{ background: s.border }} />
                        <div className="flex-1 px-4 py-3">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-sm leading-none mt-0.5 shrink-0">{ins.icon}</span>
                            <p className="text-xs font-bold text-slate-900 leading-snug">{ins.title}</p>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5 pl-5">{ins.body}</p>
                          <p className="text-[11px] font-semibold leading-snug pl-5" style={{ color: s.action }}>
                            → {ins.action}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Distribution donut ────────────────────────────────────────── */}
          {byPocket.length > 0 && (
            <div>
              <SectionHeader>Distribución</SectionHeader>
              <Card className="p-5">
                <InsightDonut segments={donutSegments} />
              </Card>
            </div>
          )}

          {/* ── By category ───────────────────────────────────────────────── */}
          {byPocket.length > 0 && (
            <div>
              <SectionHeader>Por categoría</SectionHeader>
              <Card className="overflow-hidden">
                {byPocket.map(({ id, name, budget, spent, palIdx, icon: storedIcon }, idx) => {
                  const shareRatio  = spent / (totalSpent || 1)
                  const budgetRatio = budget > 0 ? spent / budget : 0
                  // Single percentage: budget usage when budget exists, share of total otherwise
                  const pct         = budget > 0
                    ? Math.round(budgetRatio * 100)
                    : Math.round(shareRatio * 100)
                  const pctLabel    = budget > 0 ? 'del presupuesto' : 'del total'
                  const icon        = getPocketIcon(id, name, storedIcon)
                  const pal         = getPocketPalette(id, palIdx)
                  const isExpanded  = expandedPocket === id
                  const pocketExpenses = expenses
                    .filter(e => e.pocketId === id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                  const isLast = idx === byPocket.length - 1

                  return (
                    <div key={id} className={!isLast ? 'border-b border-slate-100' : ''}>
                      {/* Header row — clickeable */}
                      <button
                        type="button"
                        onClick={() => setExpandedPocket(isExpanded ? null : id)}
                        className="w-full flex items-center gap-3 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base leading-none shrink-0 select-none"
                          style={{ backgroundColor: pal.bg }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{name}</span>
                            <div className="flex items-baseline gap-2 shrink-0">
                              <span className="text-sm font-bold text-slate-900 tabular-nums">
                                {mm(spent)}
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: pal.text }}>
                                {pct}% {pctLabel}
                              </span>
                            </div>
                          </div>
                          <ProgressBar
                            ratio={budget > 0 ? budgetRatio : shareRatio}
                            thick
                            color={budget > 0 ? undefined : pal.bar}
                          />
                          {budget > 0 && budget - spent > 0 && (
                            <p className="text-[10px] mt-1 tabular-nums font-semibold" style={{ color: pal.text }}>
                              {mm(budget - spent)} Disponible de {mm(budget)}
                            </p>
                          )}
                          {budget > 0 && budget - spent <= 0 && (
                            <p className="text-[10px] mt-1 tabular-nums font-semibold text-red-500">
                              Excedido en {mm(spent - budget)}
                            </p>
                          )}
                        </div>
                        {/* Chevron */}
                        <span
                          className="text-slate-300 shrink-0 text-lg transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          ›
                        </span>
                      </button>

                      {/* Expanded expense list */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70">
                          {pocketExpenses.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin movimientos en esta categoría</p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {pocketExpenses.map(e => {
                                const d = new Date(e.date)
                                const dateStr = d.toLocaleDateString(config.locale, { day: 'numeric', month: 'short' })
                                return (
                                  <div key={e.id} className="flex items-center justify-between px-5 py-3 gap-3">
                                    <span className="text-[10px] text-slate-400 font-medium shrink-0 w-12">{dateStr}</span>
                                    <span className="text-xs text-slate-700 flex-1 truncate capitalize">{e.concept}</span>
                                    <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                                      {mm(e.amount)}
                                    </span>
                                  </div>
                                )
                              })}
                              <div className="flex justify-between items-center px-5 py-2.5 bg-slate-100/80">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {pocketExpenses.length} movimiento{pocketExpenses.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: pal.text }}>
                                  {mm(spent)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Card>
            </div>
          )}

          {/* ── Top expenses ──────────────────────────────────────────────── */}
          <div>
            <SectionHeader>Top gastos</SectionHeader>
            <Card className="p-5 space-y-3.5">
              {byConcept.map(([concept, amount], i) => {
                const pal = POCKET_PALETTE[i % POCKET_PALETTE.length]
                return (
                  <div key={concept} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                      style={{ backgroundColor: pal.bar }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm text-slate-700 capitalize truncate font-semibold">
                          {concept}
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                          {mm(amount)}
                        </span>
                      </div>
                      <ProgressBar ratio={amount / (totalSpentRaw || 1)} color={pal.bar} />
                    </div>
                  </div>
                )
              })}
              <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {mm(totalSpentRaw)}
                </span>
              </div>
            </Card>
          </div>

          {/* ── Historial ─────────────────────────────────────────────────── */}
          {historialMonths.length > 0 && (
            <div>
              <SectionHeader>Historial</SectionHeader>

              {/* Trend message */}
              {trendMsg && (
                <div
                  className="mb-3 rounded-2xl px-4 py-3.5 flex items-start gap-2.5"
                  style={{
                    background: 'linear-gradient(135deg, #F0FDFA, #EDE9FE)',
                    border: '1px solid rgba(15,118,110,.12)',
                  }}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">📊</span>
                  <p className="text-sm font-semibold text-slate-700 leading-snug">{trendMsg}</p>
                </div>
              )}

              <Card className="divide-y divide-slate-50">
                {historialMonths.map(m => (
                  <div key={m.key} className="px-4 py-3.5">
                    {/* Month header row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 capitalize">{m.name}</span>
                        {m.isBest && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                            Mejor mes
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {mm(m.totalSpent)}
                      </span>
                    </div>

                    {/* Sub-row: savings + vs last */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {m.income > 0 ? (
                          <span className={`text-[10px] font-semibold tabular-nums ${
                            m.savings >= 0 ? 'text-teal-600' : 'text-red-500'
                          }`}>
                            {m.savings >= 0
                              ? `Ahorraste ${mm(m.savings)}`
                              : `Superaste por ${mm(-m.savings)}`}
                            {m.savingsRate !== null && m.savings > 0 && ` (${m.savingsRate}%)`}
                          </span>
                        ) : m.budget > 0 ? (
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            de {mm(m.budget)} presupuesto
                          </span>
                        ) : null}
                        {m.topCategory && (
                          <span className="text-[10px] text-slate-300">·</span>
                        )}
                        {m.topCategory && (
                          <span className="text-[10px] text-slate-400 capitalize">{m.topCategory}</span>
                        )}
                      </div>
                      {m.vsLast !== null && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            m.vsLast > 0
                              ? 'bg-red-100 text-red-600'
                              : m.vsLast < 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.vsLast > 0 ? `+${m.vsLast}%` : m.vsLast < 0 ? `${m.vsLast}%` : '='}
                        </span>
                      )}
                    </div>

                    {/* Budget progress bar (when no income context) */}
                    {m.income === 0 && m.budget > 0 && (
                      <div className="mt-2">
                        <ProgressBar ratio={m.totalSpent / m.budget} thick />
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
