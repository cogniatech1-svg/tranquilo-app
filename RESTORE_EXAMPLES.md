# Ejemplos Prácticos de Restauración

## 📌 Ejemplo 1: Restauración Simple (Datos Correctos)

**Escenario:** Tienes backup de abril 2026 correctamente registrado.

```javascript
// 1. Define tus datos
const month = "2026-04"
const income = 2_000_000
const savings = 400_000
const pockets = [
  { id: 'recreacion', name: 'Recreación', budget: 100_000 },
  { id: 'hogar', name: 'Hogar', budget: 800_000 },
  { id: 'alimentacion', name: 'Alimentación', budget: 600_000 }
]
const expenses = [
  { id: '1', concept: 'Mercado semanal', amount: 125_000, pocketId: 'alimentacion', date: '2026-04-15' },
  { id: '2', concept: 'Servicios (agua, luz, internet)', amount: 350_000, pocketId: 'hogar', date: '2026-04-01' },
  { id: '3', concept: 'Cine + Netflix', amount: 80_000, pocketId: 'recreacion', date: '2026-04-20' }
]

// 2. Importa la función (ya está en utils)
import { restoreFromBackup } from './lib/utils'

// 3. Valida y obtén el reporte
const restoration = restoreFromBackup(income, savings, expenses, [], pockets, month)

// 4. Revisa advertencias
console.log(restoration.summary)

// 5. Si está todo OK, ejecuta el código
setMonthlyHistory(prev => ({
  ...prev,
  [month]: restoration.report.normalized
}))

// ✅ Resultado: Datos restaurados sin cambios
```

---

## 📌 Ejemplo 2: Datos con Inconsistencia (assigned > budget)

**Escenario:** Presupuestos asignados superan el presupuesto disponible.

```javascript
const income = 1_000_000
const savings = 200_000
// budget = 800_000

const pockets = [
  { id: 'hogar', name: 'Hogar', budget: 500_000 },      // 500k
  { id: 'alimentacion', name: 'Alimentación', budget: 400_000 }  // 400k
  // Total: 900k > budget 800k ❌
]

const restoration = restoreFromBackup(income, savings, [], [], pockets, "2026-04")

console.log(restoration.summary)
/*
⚠️  Presupuestos asignados (900000) excedían budget (800000). 
    Reducidos proporcionalmente a 800000

Ratio: 800/900 = 0.889
Hogar:       500 * 0.889 = 445k
Alimentación: 400 * 0.889 = 356k
Total:                      801k ≈ 800k ✓
*/

// El sistema ajusta automáticamente
const normalized = restoration.report.normalized
console.log(normalized.pockets)
// [
//   { id: 'hogar', name: 'Hogar', budget: 444444 },      
//   { id: 'alimentacion', name: 'Alimentación', budget: 355556 }
// ]

// Restaurar
setMonthlyHistory(prev => ({
  ...prev,
  "2026-04": normalized
}))

// ✅ Resultado: Presupuestos rebalanceados sin perder datos
```

---

## 📌 Ejemplo 3: Datos con savings > income

**Escenario:** El ahorro es mayor que los ingresos (error común en backups corruptos).

```javascript
const income = 2_000_000
const savings = 3_000_000  // ❌ Imposible: savings > income
const expenses = []
const pockets = [/* ... */]

const restoration = restoreFromBackup(income, savings, expenses, [], pockets, "2026-04")

console.log(restoration.summary)
/*
⚠️  Savings (3000000) > Income (2000000). 
    Ajustado a 400000 (20% del ingreso)

Advertencia: Se aplicó default automático de 20% del ingreso
*/

// El sistema ajusta savings
const normalized = restoration.report.normalized
console.log({
  income: normalized.income,      // 2_000_000
  savings: normalized.savings     // 400_000 (20% default)
})

setMonthlyHistory(prev => ({
  ...prev,
  "2026-04": normalized
}))

// ✅ Resultado: Savings reajustado a valor sensato
```

---

## 📌 Ejemplo 4: Gastos Excedenbudget (Advertencia)

**Escenario:** Hay más gastos que presupuesto (pero no se eliminan).

```javascript
const income = 1_000_000
const savings = 200_000
// budget = 800_000

const expenses = [
  { id: '1', concept: 'Gasto 1', amount: 500_000, pocketId: 'hogar', date: '2026-04-01' },
  { id: '2', concept: 'Gasto 2', amount: 400_000, pocketId: 'hogar', date: '2026-04-15' }
  // Total: 900_000 > budget 800_000 ❌
]

const restoration = restoreFromBackup(income, savings, expenses, [], [], "2026-04")

console.log(restoration.summary)
/*
⚠️  Gastos totales (900000) exceden budget (800000). 
    Diferencia: 100000

→ Los datos se cargarán como están, pero la validación los detectará en carga posterior
*/

// Los gastos NO se eliminan, se cargan tal cual
const normalized = restoration.report.normalized
console.log(normalized.expenses.length)  // 2 gastos intactos

setMonthlyHistory(prev => ({
  ...prev,
  "2026-04": normalized
}))

console.log(restoration.report.warnings)
// Verás la advertencia clara

// ✅ Resultado: Datos restaurados con advertencia visible
// 📝 El usuario puede tomar decisión manualmente
```

---

## 📌 Ejemplo 5: Restauración desde CSV/JSON

**Escenario:** Tienes datos en un archivo que quieres importar.

```javascript
// archivo-backup.json
{
  "month": "2026-03",
  "income": 2500000,
  "savings": 500000,
  "pockets": [
    { "id": "hogar", "name": "Hogar", "budget": 1000000 },
    { "id": "alimentacion", "name": "Alimentación", "budget": 700000 },
    { "id": "recreacion", "name": "Recreación", "budget": 200000 }
  ],
  "expenses": [
    { "id": "1", "concept": "Servicios", "amount": 450000, "pocketId": "hogar", "date": "2026-03-05" },
    { "id": "2", "concept": "Mercado", "amount": 350000, "pocketId": "alimentacion", "date": "2026-03-10" },
    { "id": "3", "concept": "Cine", "amount": 150000, "pocketId": "recreacion", "date": "2026-03-22" }
  ]
}

// En React:
const handleImportBackup = async (file: File) => {
  const text = await file.text()
  const data = JSON.parse(text)
  
  const restoration = restoreFromBackup(
    data.income,
    data.savings,
    data.expenses,
    [],
    data.pockets,
    data.month
  )
  
  // Mostrar reporte al usuario
  console.log(restoration.summary)
  
  if (restoration.report.valid) {
    // Restaurar automáticamente
    setMonthlyHistory(prev => ({
      ...prev,
      [data.month]: restoration.report.normalized
    }))
    alert('✅ Datos restaurados exitosamente')
  } else {
    // Mostrar advertencias y pedir confirmación
    alert(`⚠️ ${restoration.report.warnings.length} advertencias.\n\n${restoration.summary}`)
    
    // Permitir que el usuario decida continuar
    if (window.confirm('¿Continuar con restauración?')) {
      setMonthlyHistory(prev => ({
        ...prev,
        [data.month]: restoration.report.normalized
      }))
    }
  }
}

// ✅ Resultado: Importación segura con validación
```

---

## 📌 Ejemplo 6: Restaurar Múltiples Meses

**Escenario:** Tienes historiales de varios meses para restaurar.

```javascript
const backups = [
  {
    month: "2026-01",
    income: 2000000,
    savings: 400000,
    pockets: [ /* ... */ ],
    expenses: [ /* ... */ ]
  },
  {
    month: "2026-02",
    income: 2000000,
    savings: 400000,
    pockets: [ /* ... */ ],
    expenses: [ /* ... */ ]
  },
  {
    month: "2026-03",
    income: 2500000,
    savings: 500000,
    pockets: [ /* ... */ ],
    expenses: [ /* ... */ ]
  }
]

// Restaurar todos de una vez
const restoredHistory: Record<string, MonthRecord> = {}

for (const backup of backups) {
  const restoration = restoreFromBackup(
    backup.income,
    backup.savings,
    backup.expenses,
    [],
    backup.pockets,
    backup.month
  )
  
  if (!restoration.report.valid) {
    console.warn(`⚠️  ${backup.month} tiene advertencias:`, restoration.report.warnings)
  }
  
  restoredHistory[backup.month] = restoration.report.normalized
}

// Restaurar todo de una vez
setMonthlyHistory(prev => ({
  ...prev,
  ...restoredHistory
}))

console.log(`✅ Restaurados ${Object.keys(restoredHistory).length} meses`)

// ✅ Resultado: Histórico completo restaurado
```

---

## 🔍 Validación Paso a Paso

Para cualquier restauración, el sistema sigue este flujo:

```
1. Validar income >= 0
   └─ Si no: ajustar a 0

2. Validar savings >= 0 y savings <= income
   └─ Si savings < 0: ajustar a 0
   └─ Si savings > income: ajustar a 20% default

3. Calcular budget = income - savings

4. Validar assigned <= budget
   └─ Si no: reducir pockets proporcionalmente

5. Validar spent <= budget
   └─ Si no: advertencia (datos se cargan como están)

6. Generar reporte con advertencias y datos normalizados
```

---

## 💡 Tips Útiles

### Tip 1: Guardar Backup Periódico
```javascript
const backupData = {
  month: getCurrentMonth(),
  income: monthData.income,
  savings: monthData.savings,
  pockets: monthData.pockets,
  expenses: monthData.expenses
}

localStorage.setItem('backup_' + monthData.month, JSON.stringify(backupData))
```

### Tip 2: Validar Antes de Enviar al Servidor
```javascript
const restoration = restoreFromBackup(income, savings, expenses, [], pockets, month)

if (restoration.report.valid) {
  // Enviar al servidor
  await fetch('/api/backup', {
    method: 'POST',
    body: JSON.stringify(restoration.report.normalized)
  })
}
```

### Tip 3: Mostrar Reporte al Usuario
```typescript
<div>
  <p>{restoration.summary}</p>
  {restoration.report.warnings.length > 0 && (
    <div className="warnings">
      {restoration.report.warnings.map(w => <p>{w}</p>)}
    </div>
  )}
</div>
```

---

## ❓ Preguntas Frecuentes

**P: ¿Se pierden datos?**
R: No. La función nunca elimina datos. Solo ajusta presupuestos proporcionalmente si es necesario.

**P: ¿Qué pasa si los gastos son > budget?**
R: Se muestran en una advertencia, pero los gastos se cargan intactos. El validador los detectará en la siguiente carga.

**P: ¿Puedo restaurar datos que fallaron validación anterior?**
R: Sí. `restoreFromBackup` te mostrará exactamente qué se debe ajustar.

**P: ¿Hay limite de meses que puedo restaurar?**
R: No hay límite técnico. Puedes restaurar años de histórico.

**P: ¿Se sincroniza con el servidor?**
R: Solo si integras `fetch()` en tu código. Actualmente es solo localStorage.
