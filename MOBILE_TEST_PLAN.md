# 📱 Plan de Verificación: Tranquilo Fase 1 en Mobile

**Objetivo:** Verificar que gastos, ingresos y presupuestos persisten sin perderse

**Entorno:** Solo app móvil (sin desktop)

---

## Test 1: Persistencia de Gastos ✅

### Pasos
1. Abre la app en móvil
2. Ve a "Movimientos" (pestaña gastos)
3. Haz click en "+" para agregar un nuevo gasto
4. Llena:
   - **Concepto:** "Café mañana" (algo descriptivo)
   - **Monto:** $5,000 (o lo que sea)
   - **Bolsillo:** "Recreación"
   - **Fecha:** Hoy
5. Presiona "Guardar"
6. **Espera 3 segundos** (auto-save debounce)
7. **Cierra la app COMPLETAMENTE** (no en background, ciérrala del task switcher)
8. **Reabre la app**

### Criterios de Éxito ✓
- [ ] El gasto "Café mañana" aparece en la lista
- [ ] El monto es correcto ($5,000)
- [ ] Está en el mes correcto (mayo)
- [ ] El bolsillo es correcto (Recreación)
- [ ] Console log muestra: `[AUTO-SAVE] ✅ Saved to Supabase successfully`

### Si falla:
- Abre consola (F12 en app móvil)
- Busca `[AUTO-SAVE]` o `[SAVE-NOW]` 
- Reporta si ves error ❌

---

## Test 2: Persistencia de Ingresos Extras ✅

### Pasos
1. App abierta (con el gasto anterior)
2. Ve a "Movimientos"
3. Haz click en "+" para agregar ingreso
4. Llena:
   - **Concepto:** "Bono extra"
   - **Monto:** $50,000
   - **Tipo:** Extra income
5. Presiona "Guardar"
6. **Espera 3 segundos**
7. **Cierra la app COMPLETAMENTE**
8. **Reabre la app**

### Criterios de Éxito ✓
- [ ] El ingreso "Bono extra" aparece en movimientos
- [ ] El monto es $50,000
- [ ] El dashboard muestra aumento de ingresos totales

### Si falla:
- Busca en consola: `[AUTO-SAVE]` o `[SAVE-NOW]`

---

## Test 3: Persistencia de Presupuesto ✅

### Pasos
1. App abierta
2. Ve a la pestaña "Presupuesto"
3. Asigna presupuesto a **dos bolsillos**:
   - Hogar: $500,000
   - Transporte: $200,000
4. Presiona "Guardar" (si hay botón) o simplemente cambiar campos
5. **Espera 3 segundos**
6. **Cierra la app COMPLETAMENTE**
7. **Reabre la app**
8. Ve a "Presupuesto"

### Criterios de Éxito ✓
- [ ] Hogar muestra $500,000
- [ ] Transporte muestra $200,000
- [ ] Los valores persisten (no volvieron a 0)
- [ ] Dashboard muestra presupuesto total correcto

### Si falla:
- Revisa consola por `[BUDGET]` logs
- Verifica que Supabase `manual_budget` column existe

---

## Test 4: Herencia de Bolsillos en Nuevo Mes ✅

### Pasos
1. Estamos en **Mayo 2026** (mes actual)
2. Verificar que tienes gastos en mayo:
   - Dashboard muestra "Mayo 2026"
   - Algunos gastos registrados
3. Ve a Presupuesto y asigna:
   - Hogar: $800,000
   - Extras: $100,000
4. **Cambia el mes a Junio** (navega hacia adelante si hay control de meses)
   - O espera a que llegue junio si la app solo muestra mes actual
5. Abre Presupuesto en Junio

### Criterios de Éxito ✓
- [ ] Junio muestra los mismos bolsillos que Mayo
- [ ] Hogar existe en Junio
- [ ] Extras existe en Junio
- [ ] **Pero los presupuestos están en 0** (se reinician)
- [ ] Los gastos de Mayo NO aparecen en Junio

### Si falla:
- Revisa consola por `[dataMigration]` o `getActiveMonthData`

---

## ✅ Resumen de Éxito

Si TODOS los tests pasan:
```
✅ Gastos persisten
✅ Ingresos persisten
✅ Presupuestos persisten
✅ Bolsillos se heredan en nuevo mes
→ FASE 1 LISTA PARA PRODUCCIÓN
```

## ❌ Si algo falla

Reporta:
1. **Qué test falló** (Test 1, 2, 3, o 4)
2. **Qué paso exacto** (ej: "presupuesto no persiste")
3. **Qué ves en consola** (F12 → Console tab)
4. **Logs importantes:**
   - `[AUTO-SAVE]`
   - `[SAVE-NOW]`
   - `[ERROR]`
   - `[Supabase]`

---

## 📝 Notas Técnicas

- **localStorage backup:** Si Supabase falla, localStorage es fallback
- **Debounce:** 2 segundos de espera antes de guardar (por eso el "Espera 3 segundos")
- **visibilitychange:** Al cerrar app, se guarda inmediatamente (no espera 2s)
- **Guest mode:** Si NO iniciaste sesión, datos se guardan con UUID único en localStorage

---

**Testing Protocol:**
> Estos tests verifican el requisito principal: **"datos que nunca desaparecen"**
