/**
 * SCRIPT DE RESTAURACIÓN - ABRIL 2026
 * Parsea CSV completo y reconstruye monthlyHistory
 */

const csvData = `Fecha,Tipo,Categoría,Monto,Descripción
2026-04-27,gasto,Transporte,3000,moto
2026-04-27,gasto,Transporte,3000,moto
2026-04-26,gasto,Hogar,6000,pan
2026-04-26,gasto,Recreación,35600,helados
2026-04-26,gasto,Transporte,3000,moto
2026-04-26,gasto,Extras,15000,almuerzo
2026-04-26,gasto,Recreación,35600,crepes
2026-04-26,gasto,Transporte,4000,buseta
2026-04-25,gasto,Extras,64000,arreglo
2026-04-25,gasto,Transporte,4000,transcaribe
2026-04-25,gasto,Recreación,78700,pizza
2026-04-24,gasto,Hogar,14530,Ara
2026-04-24,gasto,Transporte,3000,Moto
2026-04-24,gasto,Extras,4700000,Cadenas
2026-04-24,ingreso,Ingresos,4700000,
2026-04-23,gasto,Transporte,18000,Taxi
2026-04-23,gasto,Extras,32709,Naranjas
2026-04-23,gasto,Hogar,5010,Azúcar
2026-04-22,gasto,Transporte,50000,transcaribe
2026-04-22,gasto,Transporte,3000,moto
2026-04-21,gasto,Servicios,41700,luz finca
2026-04-21,gasto,Recreación,5700,conos
2026-04-20,gasto,Donaciones,40000,Favio
2026-04-20,gasto,Hogar,111780,Luz apartamento
2026-04-20,gasto,Hogar,101448,mercado
2026-04-20,gasto,Servicios,20900,Chatgpt
2026-04-20,gasto,Recreación,65800,El Corral
2026-04-19,gasto,Capacitaciones,5600,Pasto taxi museo carnaval
2026-04-19,gasto,Capacitaciones,7000,Pasto taxi
2026-04-19,gasto,Capacitaciones,12000,Pasto desayuno
2026-04-19,gasto,Capacitaciones,38700,Pasto taxis aeropuerto
2026-04-19,gasto,Capacitaciones,35000,Pasto almuerzo aeropuerto
2026-04-19,gasto,Capacitaciones,12500,Pasto capuchino
2026-04-19,gasto,Extras,25000,Cena
2026-04-19,gasto,Transporte,14000,Taxi
2026-04-18,gasto,Capacitaciones,16400,Pasto desayuno
2026-04-18,gasto,Capacitaciones,62000,La cocha, almuerzo,
2026-04-18,gasto,Capacitaciones,80000,La cocha, transporte
2026-04-18,gasto,Capacitaciones,100000,La cocha paseo en lancha
2026-04-18,gasto,Capacitaciones,71400,La Cocha, souvenir madre
2026-04-18,gasto,Capacitaciones,33000,La Cocha souvenirs
2026-04-18,gasto,Capacitaciones,20000,Pasto merienda
2026-04-18,gasto,Servicios,45000,peluquería
2026-04-17,gasto,Capacitaciones,6900,Pasto taxi terminal
2026-04-17,gasto,Capacitaciones,15000,Pasto Ipiales bus
2026-04-17,gasto,Capacitaciones,6000,Ipiales desayuno
2026-04-17,gasto,Capacitaciones,4000,Ipiales bus Rumichaca y regreso
2026-04-17,gasto,Capacitaciones,115706,pasto souvenirs
2026-04-17,gasto,Capacitaciones,10000,Ipiales merienda
2026-04-17,gasto,Capacitaciones,10000,Ipiales cementerio
2026-04-17,gasto,Capacitaciones,7000,Tulcán ida y regreso Rumichaca
2026-04-17,gasto,Capacitaciones,6000,Transporte Ipiales las Lajas
2026-04-17,gasto,Capacitaciones,5700,Las Lajas, merienda
2026-04-17,gasto,Capacitaciones,34000,Las Lajas, teleférico
2026-04-17,gasto,Capacitaciones,9000,Ipiales cena
2026-04-17,gasto,Capacitaciones,16000,Ipiales pasto bus
2026-04-17,gasto,Capacitaciones,9600,Pasto taxi
2026-04-16,gasto,Capacitaciones,9000,Pasto taxi
2026-04-16,gasto,Capacitaciones,21900,Pasto desayuno almuerzo
2026-04-16,gasto,Capacitaciones,115000,Pasto souvenirs
2026-04-16,gasto,Capacitaciones,3000,Pasto pan
2026-04-16,gasto,Capacitaciones,5000,Pasto casa museo
2026-04-16,gasto,Capacitaciones,8000,Pasto taxi
2026-04-16,gasto,Capacitaciones,14500,Pasto merienda
2026-04-16,gasto,Cuota apartamento,651777,Crédito apto
2026-04-16,gasto,Hogar,127723,Agua
2026-04-16,gasto,Hogar,20104,Gas
2026-04-15,gasto,Capacitaciones,8500,Pasto taxi
2026-04-15,gasto,Capacitaciones,4000,Pasto merienda
2026-04-15,gasto,Capacitaciones,17100,Pasto almuerzo
2026-04-15,gasto,Capacitaciones,9000,Pasto taxi
2026-04-15,gasto,Extras,25900,Crema dental
2026-04-15,gasto,Capacitaciones,27000,Pasto cena
2026-04-14,gasto,Capacitaciones,12000,Taxi Cartagena
2026-04-14,gasto,Capacitaciones,22000,Pasto taxi
2026-04-14,gasto,Capacitaciones,7000,Pasto merienda
2026-04-14,gasto,Capacitaciones,14100,Pasto Mr Bono
2026-04-14,ingreso,Ingresos,2649463,
2026-04-13,gasto,Hogar,40000,Ledis
2026-04-13,gasto,Hogar,25000,Ledis
2026-04-12,gasto,Donaciones,140000,Ricardo
2026-04-12,gasto,Hogar,44086,Ara
2026-04-12,gasto,Hogar,2000,Pan
2026-04-12,gasto,Capacitaciones,345000,Pasto Airbnb
2026-04-11,gasto,Hogar,18490,Jumbo
2026-04-10,gasto,Transporte,11000,Buseta
2026-04-10,gasto,Recreación,600,Banano
2026-04-10,gasto,Recreación,23000,Gaseosas
2026-04-10,gasto,Extras,100000,Audífonos
2026-04-10,gasto,Recreación,140400,Cumpleaños Dan
2026-04-10,gasto,Recreación,32000,Almuerzos
2026-04-09,gasto,Transporte,50000,Transcaribe
2026-04-09,gasto,Hogar,18490,Jumbo
2026-04-09,gasto,Recreación,18600,Mr Bono
2026-04-09,gasto,Recreación,18600,Jugos
2026-04-08,gasto,Recreación,30800,Café instantáneo
2026-04-07,gasto,Transporte,74000,Taxi
2026-04-07,gasto,Hogar,50000,Ledis
2026-04-07,gasto,Recreación,140000,Il Forno
2026-04-07,gasto,Recreación,40000,El Depósito Café
2026-04-07,gasto,Capacitaciones,975710,Pasto Vuelo
2026-04-06,gasto,Servicios,48195,Colsanitas
2026-04-06,gasto,Servicios,73650,Celular
2026-04-06,gasto,Hogar,51244,Internet
2026-04-06,gasto,Recreación,44800,Hamburguesa
2026-04-06,gasto,Recreación,800,Botella de agua
2026-04-05,gasto,Donaciones,52000,Eucaristía
2026-04-05,gasto,Recreación,10000,El Depósito Café
2026-04-05,gasto,Recreación,74296,Mila
2026-04-05,gasto,Recreación,9000,Cerveza
2026-04-04,gasto,Hogar,35000,Ledis
2026-04-04,gasto,Hogar,3000,Pan
2026-04-04,gasto,Recreación,17300,Tostao
2026-04-03,gasto,Donaciones,140000,Ricardo
2026-04-03,gasto,Hogar,28706,Jumbo
2026-04-03,gasto,Recreación,19800,Crepes
2026-04-02,gasto,Donaciones,400000,madre
2026-04-02,gasto,Hogar,14943,Ara
2026-04-02,gasto,Recreación,25990,Jumbo salsa
2026-04-02,gasto,Recreación,3900,Mr Bono
2026-04-01,gasto,Hogar,15665,Carne
2026-04-01,gasto,Extras,506635,Lavavajillas
2026-04-01,gasto,Extras,21785,Almohadas
2026-04-01,gasto,Recreación,107967,Ollas`

// ════════════════════════════════════════════════════════════════════════════
// 1. PARSEAR CSV
// ════════════════════════════════════════════════════════════════════════════

function parseCSV(data) {
  const lines = data.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())

  const records = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return {
      date: values[0],
      tipo: values[1],
      categoria: values[2],
      monto: parseInt(values[3], 10),
      descripcion: values[4] || ''
    }
  })

  return records
}

// ════════════════════════════════════════════════════════════════════════════
// 2. CLASIFICAR REGISTROS
// ════════════════════════════════════════════════════════════════════════════

function classifyRecords(records) {
  const expenses = []
  const extraIncomes = []

  for (const record of records) {
    if (record.tipo === 'ingreso') {
      extraIncomes.push({
        id: Date.now().toString() + Math.random(),
        amount: record.monto,
        concept: record.descripcion || 'Ingreso adicional',
        date: record.date,
        category: 'extra'
      })
    } else if (record.tipo === 'gasto') {
      expenses.push({
        id: Date.now().toString() + Math.random(),
        amount: record.monto,
        concept: record.descripcion,
        pocketId: mapCategoryToPocketId(record.categoria),
        date: record.date
      })
    }
  }

  return { expenses, extraIncomes }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. MAPEAR CATEGORÍA A POCKET ID
// ════════════════════════════════════════════════════════════════════════════

function mapCategoryToPocketId(categoria) {
  const mapping = {
    'Capacitaciones': 'capacitaciones',
    'Extras': 'extras',
    'Recreación': 'recreacion',
    'Hogar': 'hogar',
    'Donaciones': 'donaciones',
    'Servicios': 'servicios',
    'Transporte': 'transporte',
    'Cuota apartamento': 'cuota_apartamento'
  }
  return mapping[categoria] || categoria.toLowerCase().replace(/\s+/g, '_')
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CONSTRUIR POCKETS CON IDS
// ════════════════════════════════════════════════════════════════════════════

const pockets = [
  { id: 'capacitaciones', name: 'Capacitaciones', budget: 2366316 },
  { id: 'extras', name: 'Extras', budget: 5491029 },
  { id: 'recreacion', name: 'Recreación', budget: 979253 },
  { id: 'hogar', name: 'Hogar', budget: 733219 },
  { id: 'donaciones', name: 'Donaciones', budget: 772000 },
  { id: 'servicios', name: 'Servicios', budget: 229445 },
  { id: 'transporte', name: 'Transporte', budget: 240000 },
  { id: 'cuota_apartamento', name: 'Cuota apartamento', budget: 651777 }
]

// ════════════════════════════════════════════════════════════════════════════
// 5. PROCESAR DATOS
// ════════════════════════════════════════════════════════════════════════════

const records = parseCSV(csvData)
const { expenses, extraIncomes } = classifyRecords(records)

const income = 8752707
const savings = 0
const month = '2026-04'

// ════════════════════════════════════════════════════════════════════════════
// 6. VALIDAR COHERENCIA (SIN BORRAR DATOS)
// ════════════════════════════════════════════════════════════════════════════

const totalIncomeValue = income + extraIncomes.reduce((sum, e) => sum + e.amount, 0)
const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
const totalAssigned = pockets.reduce((sum, p) => sum + p.budget, 0)
const balance = totalIncomeValue - totalExpenses

console.log('\n════════════════════════════════════════════════════════════════')
console.log('📊 VALIDACIÓN DE DATOS - ABRIL 2026')
console.log('════════════════════════════════════════════════════════════════\n')

console.log('📈 INGRESOS:')
console.log(`  Income base:        $${income.toLocaleString()}`)
console.log(`  Ingresos adicionales: ${extraIncomes.length}`)
extraIncomes.forEach(e => {
  console.log(`    - ${e.date}: $${e.amount.toLocaleString()} (${e.concept})`)
})
console.log(`  Total ingresos:     $${totalIncomeValue.toLocaleString()}`)

console.log('\n💰 GASTOS:')
console.log(`  Total gastos:       $${totalExpenses.toLocaleString()}`)
console.log(`  Número de gastos:   ${expenses.length}`)

console.log('\n💼 PRESUPUESTOS:')
console.log(`  Total asignado:     $${totalAssigned.toLocaleString()}`)
pockets.forEach(p => {
  const spent = expenses.filter(e => e.pocketId === p.id).reduce((sum, e) => sum + e.amount, 0)
  const available = p.budget - spent
  const percentage = Math.round((spent / p.budget) * 100)
  console.log(`    ${p.name.padEnd(20)}: $${spent.toLocaleString().padStart(10)} / $${p.budget.toLocaleString().padStart(10)} (${percentage}%)`)
})

console.log('\n✅ VALIDACIÓN:')
console.log(`  ✓ Total ingresos:      $${totalIncomeValue.toLocaleString()}`)
console.log(`  ✓ Total gastos:        $${totalExpenses.toLocaleString()}`)
console.log(`  ✓ Total asignado:      $${totalAssigned.toLocaleString()}`)
console.log(`  ✓ Balance:             $${balance.toLocaleString()}`)
console.log(`  ✓ Registros:           ${expenses.length} gastos + ${extraIncomes.length} ingresos`)

// ════════════════════════════════════════════════════════════════════════════
// 7. CONSTRUIR monthlyHistory
// ════════════════════════════════════════════════════════════════════════════

const monthlyHistory = {
  [month]: {
    income,
    savings,
    expenses,
    extraIncomes,
    pockets
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 8. GENERAR CÓDIGO REACT
// ════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════════')
console.log('📝 CÓDIGO PARA RESTAURAR EN app.tsx')
console.log('════════════════════════════════════════════════════════════════\n')

const code = `
// Copiar este código en app.tsx y ejecutar
const monthlyHistory = {
  "${month}": {
    income: ${income},
    savings: ${savings},
    expenses: ${JSON.stringify(expenses, null, 4)},
    extraIncomes: ${JSON.stringify(extraIncomes, null, 4)},
    pockets: ${JSON.stringify(pockets, null, 4)}
  }
}

setMonthlyHistory(monthlyHistory)

console.log('✅ Datos restaurados para ${month}')
console.log({
  totalIncome: ${totalIncomeValue},
  totalExpenses: ${totalExpenses},
  totalAssigned: ${totalAssigned},
  balance: ${balance}
})
`

console.log(code)

// ════════════════════════════════════════════════════════════════════════════
// 9. EXPORTAR DATOS
// ════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════════')
console.log('✅ DATOS LISTOS PARA RESTAURAR')
console.log('════════════════════════════════════════════════════════════════\n')

// Mostrar resumen final
console.log({
  month,
  recordsProcessed: records.length,
  expensesCount: expenses.length,
  incomesCount: extraIncomes.length,
  pocketsCount: pockets.length,
  income,
  savings,
  totalIncome: totalIncomeValue,
  totalExpenses,
  totalAssigned,
  balance
})
