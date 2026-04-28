# Guía de Restauración Segura de Datos Financieros

## 🎯 Objetivo
Restaurar datos financieros históricos sin generar inconsistencias ni disparar el validador automático.

## 📋 Requisitos para Restauración

Necesitas proporcionar:

```typescript
interface RestaurantionData {
  month: string              // Formato: "2026-04"
  income: number            // Ingresos totales del mes
  savings: number           // Ahorro definido
  pockets: Pocket[]         // Presupuestos por categoría
  expenses: Expense[]       // Gastos registrados
  extraIncomes?: any[]      // Ingresos adicionales (opcional)
}
```

## 📝 Estructura de Datos

### Bolsillos (Pockets)
```json
[
  {
    "id": "hogar",
    "name": "Hogar",
    "budget": 800000,
    "icon": "🏠"
  },
  {
    "id": "alimentacion",
    "name": "Alimentación",
    "budget": 600000,
    "icon": "🍔"
  }
]
```

### Gastos (Expenses)
```json
[
  {
    "id": "1",
    "concept": "Mercado semanal",
    "amount": 125000,
    "pocketId": "alimentacion",
    "date": "2026-04-15"
  },
  {
    "id": "2",
    "concept": "Servicios",
    "amount": 250000,
    "pocketId": "hogar",
    "date": "2026-04-01"
  }
]
```

## 🔍 Validación de Coherencia

El sistema verifica automáticamente:

```
✅ income >= savings
   └─ Si falla: ajusta savings a 20% del ingreso

✅ assigned <= budget
   └─ Donde: budget = income - savings
   └─ Si falla: reduce presupuestos proporcionalmente

✅ spent <= budget
   └─ Donde: spent = suma de expenses
   └─ Si falla: muestra advertencia (no elimina gastos)
```

## 💻 Métodos de Restauración

### Opción 1: Panel Interactivo (Más Fácil)

```typescript
// En tu componente, agrega:
import { DataRestoreScreen } from './screens/DataRestoreScreen'

// Renderiza el componente:
<DataRestoreScreen
  onRestore={(month, monthRecord) => {
    setMonthlyHistory(prev => ({
      ...prev,
      [month]: monthRecord
    }))
  }}
  onClose={() => setShowRestore(false)}
/>
```

### Opción 2: Función Helper (Programática)

```typescript
import { restoreFromBackup } from './lib/utils'

const restoration = restoreFromBackup(
  2000000,        // income
  400000,         // savings
  [/* expenses */],
  [],             // extraIncomes
  [/* pockets */],
  "2026-04"       // month
)

console.log(restoration.summary)   // Ver advertencias
console.log(restoration.code)      // Ver código generado

// Luego ejecuta en setState:
setMonthlyHistory(prev => ({
  ...prev,
  [month]: restoration.report.normalized
}))
```

### Opción 3: DevTools Console (Directo)

```javascript
// En browser console:
const { restoreFromBackup } = await import('/lib/utils.js')

const result = restoreFromBackup(
  2000000,
  400000,
  [],
  [],
  [
    { id: 'hogar', name: 'Hogar', budget: 800000 },
    { id: 'alimentacion', name: 'Alimentación', budget: 600000 }
  ],
  "2026-04"
)

console.log(result.summary)

// Copiar y ejecutar en React DevTools:
// setMonthlyHistory(prev => ({...prev, "2026-04": {...normalized}}))
```

## ⚙️ Ejemplo Completo

### Input
```typescript
const income = 2_000_000
const savings = 400_000
const pockets = [
  { id: 'hogar', name: 'Hogar', budget: 800_000 },
  { id: 'alimentacion', name: 'Alimentación', budget: 600_000 },
  { id: 'recreacion', name: 'Recreación', budget: 100_000 }
]
const expenses = [
  { id: '1', concept: 'Mercado', amount: 250_000, pocketId: 'alimentacion', date: '2026-04-15' },
  { id: '2', concept: 'Servicios', amount: 350_000, pocketId: 'hogar', date: '2026-04-01' }
]
```

### Validación
```
✅ income (2M) >= savings (400k) ✓
✅ assigned (1.5M) <= budget (1.6M) ✓
✅ spent (600k) <= budget (1.6M) ✓

RESULTADO: Datos válidos, sin ajustes
```

### Output
```javascript
setMonthlyHistory(prev => ({
  ...prev,
  "2026-04": {
    income: 2000000,
    savings: 400000,
    expenses: [
      { id: '1', concept: 'Mercado', amount: 250000, pocketId: 'alimentacion', date: '2026-04-15' },
      { id: '2', concept: 'Servicios', amount: 350000, pocketId: 'hogar', date: '2026-04-01' }
    ],
    extraIncomes: [],
    pockets: [
      { id: 'hogar', name: 'Hogar', budget: 800000 },
      { id: 'alimentacion', name: 'Alimentación', budget: 600000 },
      { id: 'recreacion', name: 'Recreación', budget: 100000 }
    ]
  }
}))
```

## 🚨 Casos de Ajuste Automático

### Caso 1: savings > income
```
Input:  income=1M, savings=1.5M ❌
Output: income=1M, savings=200k (20% automático) ✓
Aviso:  "⚠️ Savings excedía income. Ajustado a 20% automáticamente"
```

### Caso 2: assigned > budget
```
Input:  budget=600k, pockets=(hogar:500k + alim:400k) = 900k ❌
Output: pockets=(hogar:333k + alim:267k) = 600k ✓ (proporcional)
Aviso:  "⚠️ Presupuestos reducidos proporcionalmente"
```

### Caso 3: spent > budget
```
Input:  budget=600k, expenses=sum=800k ❌
Output: expenses mantiene datos originales (800k)
Aviso:  "⚠️ Gastos excedenbudget. Diferencia: 200k"
        "→ Datos se cargarán pero detectarán inconsistencia"
```

## ✅ Checklist Antes de Restaurar

- [ ] Verificar que `income > 0`
- [ ] Verificar que `savings <= income`
- [ ] Verificar que cada `pocket.budget > 0`
- [ ] Verificar que cada `expense.amount > 0`
- [ ] Verificar que `expense.date` está en formato ISO (YYYY-MM-DD)
- [ ] Verificar que `pocket.id` coincide con `expense.pocketId`
- [ ] Tener un backup de localStorage antes de restaurar

## 🔄 Process Posterior a Restauración

Después de restaurar:

1. ✅ Datos se guardan en monthlyHistory[month]
2. ✅ Se persisten a localStorage automáticamente
3. ✅ La validación de carga posterior los aceptará (si son coherentes)
4. ✅ Si hay inconsistencias detectadas, se mostrarán en console

## 🐛 Troubleshooting

### "Datos se cargan pero muestran negativos"
→ Probablemente `assigned > budget`. Usa la función helper para ver el detalle.

### "Console muestra RESET POR INCONSISTENCIA"
→ Significa que los datos restaurados fallaron validación. 
→ Usa `restoreFromBackup()` para ver qué ajustes se necesitan.

### "No puedo ejecutar setState"
→ Asegúrate de tener acceso al componente. Usa en React DevTools o en app.tsx.

## 📞 Soporte

Para restaurar datos problemáticos:
1. Usa `restoreFromBackup()` para ver advertencias
2. Revisa la sección "Casos de Ajuste" arriba
3. Ejecuta el código generado
4. Verifica en DevTools que los datos se guardaron
