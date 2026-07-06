# Tranquilo — Finanzas Personales

> "Ajustes pequeños para llegar tranquilo a fin de mes."

Tranquilo es una PWA (Progressive Web App) de finanzas personales diseñada para Latinoamérica. Permite registrar gastos, gestionar bolsillos de presupuesto y visualizar el estado financiero mensual con un sistema de semáforo visual.

---

## Características

- **Semáforo visual**: el hero de la app cambia de color según el estado del mes
  - Verde (tranquilo) → gastos < 85% del presupuesto proporcional
  - Ámbar (ajustado) → 85–115%
  - Rojo (riesgo) → > 115%
- **Bolsillos de presupuesto**: categorías personalizables con presupuesto propio; el usuario los crea, edita y elimina libremente
- **Ingresos**: registro de ingreso mensual fijo + ingresos extra puntuales
- **Histórico**: los meses anteriores se archivan automáticamente al cambiar de mes
- **Insights**: análisis de patrones de gasto, predicciones y comparativos
- **Exportar datos**: JSON y CSV (compatible con Excel)
- **Soporte multi-país**: Colombia, México, Argentina, Chile, España, Perú y más
- **Autenticación con Google**: cuenta real con sincronización entre dispositivos
- **Modo invitado**: uso sin cuenta, datos guardados en el dispositivo
- **Instalable**: funciona como app nativa en Android e iOS (PWA)

---

## Stack técnico

| Capa                 | Tecnología                        |
| -------------------- | --------------------------------- |
| Framework            | Next.js 15 (App Router)           |
| UI                   | React 19 + TypeScript             |
| Estilos              | Tailwind CSS                      |
| Fuente               | Geist (Vercel)                    |
| Íconos               | Lucide React                      |
| Almacenamiento local | localStorage (cache/fallback)     |
| Backend              | Supabase (PostgreSQL + Auth)      |
| Deploy               | Vercel                            |
| PWA                  | Service Worker + Web App Manifest |

---

## Estructura del proyecto

```
tranquilo/
├── app/
│   ├── page.tsx              # Raíz de la app: estado global, auth y lógica principal
│   ├── layout.tsx            # Layout HTML, metadatos PWA y registro del SW
│   ├── globals.css           # Estilos globales
│   └── auth/callback/        # Callback OAuth para Supabase
├── screens/
│   ├── WelcomeScreen         # Pantalla de bienvenida con OAuth y modo invitado
│   ├── OnboardingScreen      # Primera configuración del usuario
│   ├── LoginScreen           # Login con email/contraseña
│   ├── DashboardScreen       # Pantalla de inicio con hero y resumen
│   ├── TransactionsScreen    # Lista de movimientos
│   ├── BudgetScreen          # Gestión de bolsillos y presupuesto
│   ├── InsightsScreen        # Análisis y gráficos
│   ├── ProfileScreen         # Perfil, histórico, exportar y ajustes
│   └── RecoveryScreen        # Restauración de cuenta / reset de contraseña
├── components/
│   ├── ui/                   # Componentes base (Card, Button, ProgressBar…)
│   ├── AddExpenseSheet       # Modal para agregar/editar gastos (con voz)
│   ├── AddExtraIncomeSheet   # Modal para ingresos extra
│   ├── MonthNavigator        # Navegación entre meses
│   ├── PocketCard            # Tarjeta de bolsillo con progreso
│   ├── ConfirmDeletePocketModal
│   ├── EmojiPicker           # Selector de íconos para bolsillos
│   └── BottomNavigation      # Barra de navegación inferior
├── lib/
│   ├── supabase.ts           # Cliente Supabase: loadUserData / saveUserData
│   ├── financialEngine.ts    # Lógica financiera centralizada (NO MODIFICAR)
│   ├── dataMigration.ts      # Reparación y normalización de datos
│   ├── carryOver.ts          # Balance acumulado entre meses
│   ├── auth.ts               # Helpers de autenticación
│   ├── storage.ts            # Capa centralizada de localStorage
│   ├── schemas.ts            # Validación Zod de datos financieros
│   ├── types.ts              # Tipos TypeScript compartidos
│   ├── config.ts             # Design system, colores, configuración por país
│   ├── constants.ts          # DEFAULT_POCKETS y constantes globales
│   └── utils.ts              # Utilidades (formateo, parsing, fechas)
└── public/
    ├── manifest.json         # Configuración PWA
    ├── sw.js                 # Service Worker
    └── icons/                # Íconos PWA
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Variables de entorno requeridas en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Deploy

El proyecto está conectado a Vercel. Cualquier push a `main` dispara un redeploy automático.

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## Datos y privacidad

Los datos financieros se guardan en **Supabase** (PostgreSQL) cuando el usuario está autenticado, y en `localStorage` como cache y fallback para modo invitado. La sincronización es automática en cada cambio relevante.

Para usuarios invitados, los datos se guardan únicamente en el dispositivo. Al crear una cuenta, los datos del modo invitado migran automáticamente a Supabase.

---

## Cambios Recientes

### Fix: Ciclo de vida de bolsillos — eliminación persistente (Julio 2026)

**Problema:** Los bolsillos eliminados por el usuario se volvían a crear automáticamente al recargar la app. En algunos casos, incluyendo bolsillos personales del equipo de desarrollo (hardcodeados como defaults).

**Causa raíz:**
Dos bugs encadenados:

1. `ensurePocketsComplete()` en `lib/dataMigration.ts` se ejecutaba en cada `initializeApp`, añadiendo cualquier bolsillo de `DEFAULT_POCKETS` que no estuviera presente en el mes — reinterpretando la eliminación del usuario como corrupción de datos.

2. En `lib/supabase.ts`, `saveUserData` guardaba `null` (en vez de `'[]'`) cuando el array de bolsillos estaba vacío. Al recargar, `null` activaba el fallback a la tabla global de pockets, reconstruyendo bolsillos desde datos antiguos.

**Solución (2 commits, rama `feature/pocket-lifecycle-fix`):**

_Commit 1 — `lib/dataMigration.ts` + `app/page.tsx`:_

- `ensurePocketsComplete` ahora solo normaliza IDs y deduplica; nunca agrega bolsillos faltantes
- Todos los fallbacks a `DEFAULT_POCKETS` en `page.tsx` eliminados; un array vacío es estado legítimo

_Commit 2 — `lib/supabase.ts`:_

- `saveUserData` serializa siempre `pockets_data`, incluso para `[]` → distingue "mes sin bolsillos" (estado legítimo) de "fila legacy sin columna" (null)
- El fallback a la tabla global solo aplica cuando `pockets_data IS NULL` (filas anteriores a la fix), nunca cuando es `'[]'`

**Escenarios validados:** 6 escenarios funcionales con cuenta de prueba (Jul–Feb 2025–2026):

1. Herencia exacta: bolsillo eliminado en mes A no aparece en mes B ✅
2. Bolsillo nuevo en mes A → heredado en mes B ✅
3. Bolsillo eliminado en mes A → NO recreado en mes B ✅
4. Presupuesto editado en mes A → heredado exactamente en mes B ✅
5. Cruce de año (Diciembre → Enero) ✅
6. Mes con cero bolsillos persiste como `'[]'` en Supabase tras reload ✅

**Archivos modificados:**

- `lib/dataMigration.ts` — eliminar lógica de re-siembra en `ensurePocketsComplete` y `repairMonthRecord`
- `app/page.tsx` — eliminar 5 referencias a `DEFAULT_POCKETS` / `getEmptyPocketsStructure`
- `lib/supabase.ts` — corregir serialización de `pockets_data` y condición de fallback

---

### Fix: Navegación de meses en Presupuesto (Mayo 2026)

**Problema:** El usuario no podía avanzar del mes de abril a mayo en la pestaña Presupuesto.

**Causa raíz:** La sincronización con el backend sobrescribía el estado React `currentMonth` con datos guardados ("2026-04"). `currentMonth` debe representar siempre el mes actual del sistema operativo, no un valor almacenado.

**Solución:** No restaurar `currentMonth` desde el backend al iniciar la app.

**Archivos modificados:** `app/page.tsx` — 1 línea comentada
