# Auditoría: Consistencia Multi-Tab y Comportamiento Temporal

**Rama:** `infra/multi-tab-consistency-audit`  
**Fecha:** 2026-05-26  
**Estado:** Diagnóstico — sin implementación

---

## 1. Modelo mental del sistema actual

### Capas de persistencia

```
┌─────────────────────────────────────────────────────────┐
│  React State (in-memory, per-tab)                       │
│  monthlyHistory / conceptMap / learnedCategoryMap / ... │
└────────────┬────────────────────────────────────────────┘
             │ writethrough: localStorage primero, luego Supabase
             ↓
┌─────────────────────────────────────────────────────────┐
│  localStorage  tranquilo_v1_<userId>                    │
│  • síncrono — siempre completa                          │
│  • compartido entre tabs del mismo origen               │
│  • NO notifica cambios a otras tabs (sin listener)      │
└─────────────────────────────────────────────────────────┘
             │ async, fire-and-forget para visibility save
             ↓
┌─────────────────────────────────────────────────────────┐
│  Supabase (fuente de verdad durable)                    │
│  users / pockets / monthly_records / expenses / ...     │
│  • upsert + delete-stale (no atómico entre saves)       │
│  • updated_at = tiempo de ESCRITURA, no de mutación     │
│  • sin timestamps de mutación en expenses               │
└─────────────────────────────────────────────────────────┘
```

### Los 5 save paths y su relación con el mutex

| Path              | Trigger                           | localStorage | Supabase                     | Mutex intra-tab                        |
| ----------------- | --------------------------------- | ------------ | ---------------------------- | -------------------------------------- |
| `SAVE-NOW`        | mutación crítica (9 call sites)   | ✅ síncrono  | ✅ async, awaited            | ✅ check + acquire                     |
| `AUTO-SAVE`       | cualquier dep change, debounce 2s | ✅ síncrono  | ✅ async, awaited            | ✅ check + acquire                     |
| `VISIBILITY`      | `visibilitychange → hidden`       | ✅ síncrono  | ⚠️ fire-and-forget           | ✅ check + acquire                     |
| `AUTH-SAVE`       | primer login, una vez por userId  | ❌ no guarda | ✅ `.finally` releases       | ✅ check + acquire (corregido 7d3dcb4) |
| `saveProfileData` | edición de perfil                 | ❌ no guarda | ✅ solo `users.profile_data` | ❌ no usa mutex                        |

**Mutex scope:** `saveInProgressRef` es un `useRef`, vive por tab. Un tab y otro tab tienen mutexes **independientes**. No hay exclusión entre tabs.

### Precedencia en carga (`initializeApp`)

```
1. Supabase loadUserData()          ← fuente de verdad primaria
2. localStorage (fallback)          ← si Supabase vacío
3. Merge Supabase + localStorage    ← si Supabase tiene pockets incompletos
4. repairStoredData()               ← reparación de dominio
```

**Desempate cuando hay conflicto:** no existe. La carga toma lo que llega primero de Supabase. Si Supabase tiene datos más viejos que localStorage (caso multi-tab), se carga lo viejo.

### El problema del delete-stale

`saveUserData` implementa un patrón **upsert + delete-stale** para cada mes:

```
1. upsert monthly_records
2. upsert ALL expenses from local state
3. DELETE expenses WHERE month=M AND id NOT IN (local ids)
4. upsert ALL extra_incomes from local state
5. DELETE extra_incomes WHERE month=M AND id NOT IN (local ids)
```

Este patrón es correcto para un único writer. Con múltiples writers simultáneos, el DELETE puede eliminar datos que el otro writer acaba de insertar. No hay atomicidad entre el upsert de un tab y el delete de otro.

---

## 2. Simulaciones de escenarios

### Escenario 1 — Dos tabs simultáneas ❌ CRÍTICO

**Setup:** Tab A y Tab B abiertas, mismo usuario, mismo mes 2026-05. Ambas cargaron `[E1, E2]`.

```
t=0  Tab A agrega E3 → state_A = [E1, E2, E3]
     saveNow(state_A): localStorage_A ← [E1,E2,E3], Supabase.upsert([E1,E2,E3])

t=1  Tab B agrega E4 → state_B = [E1, E2, E4]  ← NO tiene E3 (stale snapshot)
     saveNow(state_B): localStorage_B ← [E1,E2,E4], Supabase.upsert([E1,E2,E4])
     → Supabase DELETE WHERE id NOT IN [E1,E2,E4]
     → E3 ELIMINADO ❌

t=2  Tab A actualiza UI: E3 visible en Tab A (en memoria React)
     PERO Tab A recarga: solo ve [E1,E2,E4] — E3 perdido permanentemente
```

**Resultado:** E3 eliminado de Supabase silenciosamente. localStorage de Tab B también sobrescribe el de Tab A. **Pérdida de datos real y silenciosa.**

**Agravante cuando Tab B es más lenta en red:** Si la DELETE de Tab B llega después que la INSERT de Tab A, el window de corrupción se amplía.

---

### Escenario 2 — Dos dispositivos simultáneos ❌ CRÍTICO

Idéntico al Escenario 1 pero más probable: el usuario tiene el teléfono y la laptop abiertos.

**Espiral de corrupción:**

```
Dispositivo A guarda → B tiene snapshot stale → B guarda → A's datos eliminados
A hace otra mutación → A guarda → B's últimos datos eliminados
... ciclo continúa
```

Cada save de cualquier dispositivo puede eliminar datos del otro. El estado final en Supabase es el snapshot del **último save que ejecutó su DELETE**, no el más reciente.

---

### Escenario 3 — Tab suspendida y reactivada ❌ CRÍTICO (silencioso)

**El más traicionero:** el usuario no hace nada malo, pero pierde datos.

```
t=0    Tab A activa: state = [E1, E2, E3]
t=0    Usuario minimiza Tab A (va a otra app)
       → visibilitychange → hidden: localStorage ✅, Supabase guardado ✅

t=5min Tab B (otro dispositivo) agrega E4, E5
       Supabase ahora tiene [E1, E2, E3, E4, E5]

t=20min Usuario vuelve a Tab A
       → visibilitychange → visible: NO HAY HANDLER
       → Tab A NO recarga desde Supabase
       → Tab A state sigue siendo [E1, E2, E3] ← STALE

t=20min Usuario agrega E6 en Tab A
       saveNow(state_A = [E1,E2,E3,E6])
       → Supabase upsert [E1,E2,E3,E6]
       → DELETE WHERE NOT IN [E1,E2,E3,E6]
       → E4 y E5 ELIMINADOS ❌

Resultado: El usuario pensó que estaba agregando E6.
Realmente también borró E4 y E5 sin saberlo.
```

**Sin `visibilitychange → visible` handler, este escenario es inevitable para cualquier usuario multi-dispositivo.**

---

### Escenario 4 — Offline → Online (mismo dispositivo) ✅ RELATIVAMENTE SEGURO

```
t=0    Usuario offline. Agrega E3, E4.
       saveNow(): localStorage ✅, Supabase ❌ (network error, caught silently)
       AUTO-SAVE: localStorage ✅, Supabase ❌

t=10   Usuario vuelve online.
       NO HAY RECONEXIÓN AUTOMÁTICA.

t=10+  Usuario agrega E5 (cualquier interacción).
       AUTO-SAVE se dispara (nueva dep change).
       Supabase: upsert [E1..E5] ✅, delete-stale ✅

Resultado: los datos offline [E3,E4] se propagan a Supabase
en el primer save exitoso post-reconexión.
```

**Riesgo residual:** Si el usuario cierra el tab ANTES de cualquier interacción post-reconexión, el `visibilitychange → hidden` intenta el Supabase save pero puede fallar si sigue offline. localStorage tiene los datos, Supabase no.

---

### Escenario 5 — Offline → Online (dos dispositivos) ❌ ALTO RIESGO

```
t=0    Dispositivo A va offline con state = [E1, E2]
t=1    Dispositivo A agrega E3 offline → localStorage_A = [E1,E2,E3]

t=2    Dispositivo B (online) agrega E4
       Supabase: [E1, E2, E4]

t=10   Dispositivo A vuelve online (sin interacción todavía)
       App de A no recarga automáticamente

t=11   Dispositivo A agrega E5 (cualquier mutación)
       saveNow(state_A = [E1,E2,E3,E5])
       → Supabase upsert [E1,E2,E3,E5]
       → DELETE WHERE NOT IN [E1,E2,E3,E5]
       → E4 ELIMINADO ❌

Resultado: E4 (del Dispositivo B) desaparece.
E3 (offline del Dispositivo A) sobrevive.
```

---

### Escenario 6 — Logout/login rápidos ✅ MAYORMENTE CONTENIDO

```
t=0    Usuario autenticado, state = [E1, E2, E3]
t=0    logOut() → nuevo guest_id generado, EXPLICITLY_SIGNED_OUT set
t=0.1  SIGNED_OUT → handleAuth: userId=null, guestUserId=nuevo_guest
       dataLoadedRef.current = false (reset en próximo efecto)
t=0.2  Usuario inicia login
t=0.2  SIGNED_IN → handleAuth: userId=auth_uid
       loadedForUserRef.current ≠ auth_uid → dataLoadedRef = false
t=0.3  initializeApp(auth_uid) carga desde Supabase (fresco)

Protecciones activas:
  - loadRunIdRef: si llegan dos initializeApp en paralelo, solo el más nuevo aplica
  - dataLoadedRef.current = false: bloquea AUTO-SAVE hasta que cargue
  - authSavedForUserRef: AUTH-SAVE no se dispara hasta tener datos cargados
```

**Riesgo menor:** window muy breve donde `monthlyHistory` del usuario anterior aún está en memoria React. Pero los guards lo contienen: AUTO-SAVE verifica `!dataLoadedRef.current`.

---

### Escenario 7 — Ghost resurrection ⚠️ ALTO RIESGO

**La deleción de Tab A resucita en Tab B.**

```
t=0    Tab A y Tab B cargan [E1, E2, E3]

t=1    Tab A: usuario borra E3
       state_A = [E1, E2]
       saveNow: Supabase DELETE E3 → Supabase = [E1, E2]

t=2    Tab B: state_B sigue siendo [E1, E2, E3] (stale, no sabe del delete)
       Tab B agrega E4 → state_B = [E1, E2, E3, E4]
       saveNow: upsert [E1,E2,E3,E4], DELETE WHERE NOT IN [E1,E2,E3,E4]
       → E3 RESUCITA en Supabase ❌

t=3    Tab A recarga (o próxima carga full): ve E3 de nuevo
       El usuario piensa que borró E3 pero sigue ahí.
```

---

## 3. Mapa de precedencia de datos

### ¿Qué "gana" en cada conflicto?

```
localStorage vs Supabase (en carga):
  → Supabase gana si tiene monthlyHistory
  → localStorage gana como fallback si Supabase está vacío
  → NO hay comparación de timestamps: Supabase siempre es la verdad de carga
  → RIESGO: Supabase puede tener datos MÁS VIEJOS si otra tab ya guardó
    encima, y localStorage tiene los más nuevos — y se pierde

Tab A vs Tab B en saves concurrentes:
  → El que ejecuta su DELETE más tarde "gana" (last-delete-wins)
  → No hay timestamps de mutación: imposible determinar cuál snapshot es más nuevo
  → El ganador depende de latencia de red, no de correctitud de datos

Supabase updated_at:
  → Solo refleja cuándo fue la última escritura (WRITE time)
  → NO refleja cuándo ocurrió la mutación del usuario (MUTATION time)
  → Dos saves consecutivos rápidos pueden tener el mismo updated_at
  → No se compara en ningún path de carga actual
```

### Relación entre capas

```
Mutation (user action)
  ↓ setMonthlyHistory (React state update, synchronous)
  ↓ saveNow(updatedHistory) (called within setState callback)
    ↓ localStorage.setItem (synchronous — ALWAYS completes)
    ↓ saveUserData() (async — MAY fail or race)
      ↓ upsert monthly_record
      ↓ upsert expenses
      ↓ DELETE stale expenses   ← DANGER ZONE for concurrent saves
      ↓ upsert extra_incomes
      ↓ DELETE stale extra_incomes  ← DANGER ZONE
      ↓ upsert pockets
      ↓ delete stale pockets
      ↓ upsert concept_map
      ↓ upsert learned_category_map
```

---

## 4. Inconsistencias temporales identificadas

### 4.1 Sin timestamps de mutación

`Expense`, `MonthRecord` no tienen campo `updatedAt` (tiempo de mutación). Solo `date` (fecha de la transacción). Esto hace imposible implementar "last-mutation-wins" sin cambios de schema.

### 4.2 Sin handler `visibilitychange → visible`

Tab reactivada = snapshot potencialmente stale sin mecanismo para detectarlo. Solo hay handler para `hidden`.

### 4.3 localStorage compartido pero React state no sincronizado

localStorage del mismo origen ES compartido entre tabs. Tab B puede leer lo que Tab A escribió. Pero React state de Tab B NO se actualiza cuando Tab A escribe. Resultado: localStorage tiene datos frescos de Tab A, pero Tab B los sobreescribe en el próximo save.

### 4.4 Safety-net insuficiente

El safety-net effect (líneas 1000–1054) solo corre al inicio y solo si `expenses.length === 0`. No cubre re-activaciones de tab ni cambios hechos por otras tabs/dispositivos mientras la tab estaba activa.

### 4.5 handleChangeMonth carga parcialmente sin refrescar otros meses

Cuando el usuario navega a un mes histórico, se carga ese mes desde Supabase. Pero el mes activo (que puede haber cambiado en otra tab) no se recarga.

---

## 5. Lo que la app SÍ garantiza hoy

- **Integridad intra-tab**: el mutex previene saves concurrentes DENTRO del mismo tab
- **Durabilidad offline básica**: localStorage captura cada mutación síncronamente
- **No pérdida de datos en sesiones individuales**: si el usuario usa UN solo dispositivo y UN solo tab, los datos son consistentes
- **Datos nunca se pierden de localStorage en la tab activa**: toda mutación va a localStorage antes de Supabase
- **AUTH-SAVE no genera race con otros saves del mismo tab**: corregido en 7d3dcb4
- **isGuest detection correcta**: email no se sobreescribe; corregido en 7d3dcb4

---

## 6. Lo que la app NO garantiza hoy

- ❌ Consistencia entre dos tabs del mismo usuario
- ❌ Consistencia entre dos dispositivos del mismo usuario
- ❌ Detección de que el snapshot local está stale (sin `visibilitychange → visible`)
- ❌ Que un DELETE en Supabase persista si otra tab guarda encima (ghost resurrection)
- ❌ Que una deleción offline se propague antes que otra tab sobreescriba
- ❌ Last-mutation-wins (sin timestamps de mutación)
- ❌ Conflicto visible para el usuario (todo falla silenciosamente)

---

## 7. Estrategias futuras por nivel de complejidad

### Nivel 1 — Mitigaciones mínimas (sin nueva arquitectura)

**1a. `visibilitychange → visible` con reload condicional**  
Cuando el tab vuelve al frente después de N segundos oculto, recargar el mes activo desde Supabase. Si hay diferencias vs. el estado local, actualizar React state antes de cualquier mutación. Previene Escenario 3 (tab suspendida).

```typescript
// Pseudocódigo
if (document.visibilityState === 'visible' && hiddenDuration > 30_000) {
  // Reload current month from Supabase
  // Only update if Supabase has more data (additive merge)
}
```

**1b. `localStorage updated_at` para detección de stale en carga**  
Guardar `{ savedAt: Date.now(), ...data }` en localStorage. En `initializeApp`, comparar `savedAt` con `monthly_records.updated_at` de Supabase. Cargar el más nuevo.

**1c. Conteo antes de DELETE**  
Antes del delete-stale en `saveUserData`, verificar si Supabase tiene MÁS registros que el snapshot local. Si tiene más, omitir el DELETE (o hacer un merge additive). Previene la mayoría de los Escenarios 1, 2, 7.

```typescript
// Pseudocódigo en saveUserData
const { count: supabaseCount } = await supabase
  .from('expenses')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('month', monthKey)

if ((supabaseCount ?? 0) > monthRecord.expenses.length) {
  // Skip delete-stale — Supabase has more data than we know about
  console.warn('[Supabase] Skipping delete-stale: Supabase has more expenses than local state')
}
```

Este cambio es de bajo riesgo y cubriría los casos más dañinos sin nueva arquitectura.

---

### Nivel 2 — Detección y semi-sincronización

**2a. `storage` events para multi-tab mismo dispositivo**  
`window.addEventListener('storage', handler)` detecta cuando OTRA tab escribe en localStorage. Tab B puede recargar su React state desde localStorage cuando Tab A guarda.

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === `tranquilo_v1_${userId}` && e.newValue) {
    const fresh = parseStoredData(JSON.parse(e.newValue))
    setMonthlyHistory(fresh.monthlyHistory)
    // Nota: requiere cuidado para no interferir con saves in-progress
  }
})
```

Cubre Escenarios 1 y 7 para tabs en el mismo dispositivo. NO cubre multi-dispositivo.

**2b. Polling liviano de `monthly_records.updated_at`**  
Query periódico (30–60s) solo al campo `updated_at` de los meses activos. Si `updated_at` es más nuevo que el último save local, recargar el mes completo antes de cualquier mutación.

**2c. Version token en `monthly_records`**  
Añadir columna `client_version: bigint DEFAULT 0` a `monthly_records`. En cada save, incrementar. En carga, comparar. Si `supabase.client_version > local.client_version`, el save local está stale: no ejecutar DELETE, solo upsert.

```sql
-- Migration
ALTER TABLE monthly_records ADD COLUMN client_version BIGINT DEFAULT 0;
```

---

### Nivel 3 — Sincronización real (complejidad alta, no para ahora)

**3a. Supabase Realtime (scoped)**  
Re-introducir Realtime con scope muy específico: solo `expenses` y `extra_incomes` del usuario y mes activo. Sin suscripciones globales. Merge incoming changes into React state.

Prerequisito: los Escenarios 1–7 deben entenderse bien antes de añadir una nueva capa reactiva.

**3b. Operaciones delta (additive only)**  
Eliminar el patrón upsert+delete-stale. Reemplazar por: la app solo envía los CAMBIOS (expense agregado, expense borrado) como operaciones individuales. El servidor aplica sobre el estado actual. Requiere un modelo event-sourced o una API de deltas.

**3c. CRDTs / OT**  
Para conflict resolution real. Requeriría un cambio fundamental en el modelo de datos.

---

## 8. Qué NO implementar todavía

| Opción                                      | Por qué no ahora                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supabase Realtime completo                  | Añade complejidad reactiva sobre un problema que aún no modelamos bien                          |
| CRDTs                                       | Cambio de modelo de datos demasiado profundo                                                    |
| Conflict resolution UI                      | El usuario no espera resolver conflictos en una app de finanzas personales                      |
| Polling frecuente (<30s)                    | Cost en requests Supabase, sin beneficio proporcional                                           |
| Merge engine complejo                       | Requiere timestamps de mutación que aún no existen en el schema                                 |
| `storage` events sin `visibilitychange` fix | El 80% del problema es el tab re-focus; resolver solo multi-tab mismo dispositivo es incompleto |

---

## 9. Estrategia recomendada (orden de implementación)

```
FASE A — Quick wins (Nivel 1, bajo riesgo)
  1. visibilitychange → visible: reload condicional del mes activo
  2. Conteo antes de DELETE: skip delete-stale si Supabase tiene más datos

FASE B — Instrumentación (antes de implementar soluciones)
  3. savedAt timestamp en localStorage entry
  4. Logging explícito cuando un save detecta potencial stale snapshot

FASE C — Detección de stale (Nivel 2, moderado)
  5. storage events para multi-tab mismo dispositivo
  6. client_version en monthly_records (schema migration simple)

FASE D — Evaluar necesidad de Realtime
  7. Con Fases A–C en producción, observar logs
  8. Decidir si Realtime es necesario basado en incidentes reales
```

---

## 10. Límites explícitos del comportamiento actual

La app Tranquilo, en su estado actual, es **segura para un único usuario en un único dispositivo con una única tab activa** que no se suspende por más de unos segundos.

Es **insegura** en cualquier combinación de:

- Dos tabs abiertas simultáneamente del mismo usuario
- Dos dispositivos con la misma cuenta
- Tab que estuvo en background más de ~30s y vuelve al frente
- Uso offline en un dispositivo mientras otro dispositivo hace cambios

Estos escenarios producen **pérdida de datos silenciosa y no detectada**. No hay error, no hay warning, no hay UI de conflicto.

---

_Documento generado en rama `infra/multi-tab-consistency-audit`. No contiene cambios de código._
