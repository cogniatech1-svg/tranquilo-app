# Arquitectura Financiera de Tranquilo

## 🔒 Principio Central: Single Source of Truth

Toda la aplicación usa **UN ÚNICO ORIGEN** para cálculos financieros: `financialEngine.ts`

### Por qué

- ✅ **Consistencia**: Todos los números son iguales en todas las pantallas
- ✅ **Mantenibilidad**: Cambios en lógica se aplican automáticamente
- ✅ **Evita bugs**: No hay desincronización entre pantallas
- ✅ **Escalabilidad**: Fácil agregar nuevas métricas sin duplicar código

### La Regla: ❌ NO DUPLICAR CÁLCULOS

```typescript
// ❌ PROHIBIDO - Nunca hagas esto:
const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
const totalIncome = monthlyIncome + extraIncomes.reduce((s, e) => s + e.amount, 0)
const budget = monthlyIncome - monthlySavings

// ✅ OBLIGATORIO - Siempre usa snapshot:
const { totalExpenses, totalIncome, budget } = snapshot
```

## 📊 Flujo de Datos

```
1. RAW DATA
   ├─ expenses: Expense[]
   ├─ extraIncomes: ExtraIncome[]
   ├─ pockets: Pocket[]
   ├─ monthlyIncome: number
   └─ monthlySavings: number

2. FINANCIAL ENGINE (lib/financialEngine.ts)
   │
   └─> calculateFinancialSnapshot() 
       └─> FinancialSnapshot {
           ├─ totalIncome
           ├─ totalExpenses
           ├─ budget
           ├─ remaining
           ├─ assigned
           ├─ dailyAvailable
           ├─ expectedSpend
           ├─ status (green|yellow|red)
           └─ ... más métricas
       }

3. APP ORCHESTRATOR (app/page.tsx)
   │
   └─> const snapshot = useMemo(() => 
       calculateFinancialSnapshot({...}), [...])

4. SCREENS (DashboardScreen, BudgetScreen, InsightsScreen)
   │
   ├─> Reciben: snapshot
   ├─> Extraen: snapshot.totalExpenses, snapshot.remaining, etc.
   └─> Usan: Los valores del snapshot, NUNCA recalculan
```

## ✅ Cálculos Permitidos (No violan la regla)

### 1. En financialEngine.ts
Todos los cálculos financieros generales:
- `totalIncome = monthlyIncome + sum(extraIncomes)`
- `totalExpenses = sum(expenses)`
- `budget = totalIncome - savings`
- `remaining = budget - totalExpenses`
- `status` determination

### 2. En componentes específicos (Análisis, NO totales)
Cálculos derivados de datos ya procesados:
```typescript
// ✅ Permitido: análisis específico de InsightsScreen
const weekendAvg = weekendExpenses.reduce(...) / weekendDays
const weekdayAvg = weekdayExpenses.reduce(...) / weekdayDays

// ✅ Permitido: comparativa con mes anterior
const diff = projectedSpent - lastMonthTotal

// ✅ Permitido: gasto por categoría (desglose visual)
const spentByPocket = pockets.map(p => ({
  spent: expenses.filter(e => e.pocketId === p.id).reduce(...)
}))
```

### 3. En componentes visuales
- Formateo de números
- Cálculo de porcentajes para barras de progreso (basados en snapshot)
- Textos derivados de snapshot

## 🚫 Cálculos PROHIBIDOS

```typescript
// ❌ NUNCA hagas esto en ningún componente:

// 1. Calcular total de gastos (DUPLICA snapshot.totalExpenses)
const total = expenses.reduce((s, e) => s + e.amount, 0)

// 2. Calcular ingresos totales (DUPLICA snapshot.totalIncome)
const income = monthlyIncome + extraIncomes.reduce(...)

// 3. Calcular presupuesto (DUPLICA snapshot.budget)
const budget = income - savings

// 4. Calcular dinero disponible (DUPLICA snapshot.remaining)
const available = budget - totalSpent

// 5. Cualquier proyección sin usar snapshot
const projected = (spent / day) * daysInMonth
```

## 📋 Checklist para Nuevas Pantallas

Cuando agregues una nueva pantalla o componente:

- [ ] ¿Recibe `snapshot: FinancialSnapshot`?
- [ ] ¿Extrae valores directamente del snapshot? (no recalcula)
- [ ] ¿No tiene `reduce()` sobre `expenses` o `extraIncomes`?
- [ ] ¿Todos los totales/presupuesto vienen del snapshot?
- [ ] ¿Los números en esta pantalla = números en Dashboard?

## 🔍 Cómo Verificar

Para asegurar que no haya duplicaciones:

1. Buscar `reduce.*amount` en la pantalla
2. Si encuentra algo, ¿es análisis específico o duplica snapshot?
3. Si duplica: ⚠️ ELIMINAR y usar snapshot

```bash
# Comando para detectar posibles duplicaciones:
grep -r "reduce.*amount" screens/ components/ | grep -v "node_modules"
```

## 📞 Interfaz del Snapshot

```typescript
export interface FinancialSnapshot {
  // Totales clave
  totalIncome: number        // monthlyIncome + extraIncomes
  totalExpenses: number      // sum(expenses)
  savings: number            // monthlySavings
  budget: number             // totalIncome - savings
  
  // Métricas de disponibilidad
  assigned: number           // sum(pockets.budget)
  remaining: number          // budget - totalExpenses
  dailyAvailable: number     // remaining / daysLeft
  
  // Proyecciones
  expectedSpend: number      // (day / daysInMonth) * budget
  
  // Estado
  status: 'green' | 'yellow' | 'red'  // Salud financiera
  
  // Contexto temporal
  day: number                // Día del mes actual
  daysInMonth: number        // Días totales del mes
  
  // Ratios
  savingsRate: number        // (savings / totalIncome) * 100
}
```

## 🎯 Resumen

**Una regla simple que previene 100 bugs:**

> Si necesitas un número financiero, cógelo del snapshot.
> No lo calcules tú mismo.

¡Así de simple! 🎉
