# Plan de Migración — Tranquilo → Cloudflare Pages

> Estado: **PROPUESTA — pendiente de aprobación.** No se ha modificado ningún archivo de código del proyecto.
> Rama de trabajo: **`feature/cloudflare-pages`** (derivada de `main`). `main` permanece intacta y sigue desplegando en Vercel.
> Esta NO es una migración inmediata de producción: se construye una segunda infraestructura en paralelo. Vercel permanece como producción y rollback hasta validación 100%.

---

## Confirmación de viabilidad (inspección del repo actual)

Antes de proponer, se inspeccionó el proyecto buscando impedimentos del static export. **Resultado: sin impedimentos.**

| Bloqueante potencial                                                            | Resultado                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `middleware.ts` (incompatible con `output:'export'`)                            | ✅ No existe                                                    |
| Route handlers (un POST rompe el export)                                        | ✅ Solo 1 (`/api/delete-account`) → se reubica a Pages Function |
| Rutas dinámicas `[param]` / catch-all                                           | ✅ Ninguna                                                      |
| `next/headers` (`cookies()`/`headers()` server)                                 | ✅ Ninguna                                                      |
| `export const dynamic/revalidate` / `generateStaticParams` / `generateMetadata` | ✅ Ninguna                                                      |
| `useSearchParams` sin Suspense                                                  | ✅ Ninguna (usan `window.location`)                             |
| `redirects`/`rewrites` en `next.config`                                         | ✅ Ninguna                                                      |
| `next/image` (requiere `unoptimized`)                                           | ✅ No se usa                                                    |
| APIs Node-only en servidor (`fs`/`path`/`node:`…)                               | ✅ Ninguna                                                      |

**Conclusión:** la arquitectura _Static Export + Cloudflare Pages + 1 Pages Function_ sigue siendo la mejor alternativa para el estado actual. No se detiene la ejecución.

---

## Objetivo

Servir Tranquilo desde **Cloudflare Pages** con:

```
Static Export (Next.js) + Cloudflare Pages + 1 única Pages Function (POST /api/delete-account)
```

Sin adaptadores complejos de Next.js. **Sin cambiar la lógica de negocio.** Misma Supabase, sin migrar datos, usuarios existentes ven exactamente lo mismo.

---

## Arquitectura actual (verificada)

- **Framework:** Next.js 16.1.7 (App Router) · React 19. **Hosting:** Vercel (desde `main`).
- **Rutas:** 6 estáticas (`/`, `/_not-found`, `/auth/callback`, `/privacy`, `/reset-password`, `/terms`) + 1 dinámica: `/api/delete-account`.
- **Persistencia:** Supabase + localStorage; sync **client-side** con anon key.
- **`/api/delete-account`:** POST; verifica JWT con anon key → borra con `service_role`. Solo `@supabase/supabase-js` + `process.env`; sin APIs Node-only.
- **PWA:** `public/manifest.json` + `public/sw.js`.
- **Headers:** `next.config.ts` define CSP + `Cache-Control` (sw.js/manifest/iconos/favicon).
- **Capacitor:** empaqueta `out/` en el APK; llama a delete-account por URL absoluta (`NEXT_PUBLIC_APP_URL`).

## Arquitectura objetivo

```
Cloudflare Pages
├── Sitio estático (out/)     ← next build con output:'export'
│   ├── HTML/JS/CSS (6 rutas)
│   ├── PWA: manifest.json + sw.js
│   ├── assets / iconos
│   └── _headers              ← CSP + Cache-Control (reemplaza headers() de next.config)
└── functions/api/delete-account.ts   ← Pages Function (onRequestPost) — MISMA lógica
```

## Arquitectura final (flujo end-to-end)

```
            Usuario
              │
              ▼
     ┌──────────────────┐
     │ Cloudflare Pages │   sitio estático + PWA + manifest + service worker + assets
     └──────────────────┘
              │
     ┌────────┴─────────┐
     │                  │
 (client-side)   POST /api/delete-account
     │                  │
     │                  ▼
     │         ┌──────────────────┐
     │         │  Pages Function  │   único server (usa service_role)
     │         └──────────────────┘
     │                  │
     ▼                  ▼
  ┌───────────────────────────┐
  │      Supabase Auth        │   login / registro / sesión / JWT
  └───────────────────────────┘
              │
              ▼
  ┌───────────────────────────┐
  │    Supabase Database       │   MISMA DB · sin cambios · sin migración
  └───────────────────────────┘
              ▲
              │  (mismo bundle estático empaquetado)
     ┌──────────────────┐
     │    Capacitor     │   webDir = out/
     └──────────────────┘
              │
              ▼
     ┌──────────────────┐
     │     Android      │   APK; delete-account por URL absoluta
     └──────────────────┘
```

> El cliente habla **directo** con Supabase (auth + datos). La Pages Function solo interviene en el borrado de cuenta (necesita `service_role`). Capacitor/Android consumen el mismo `out/`.

---

## Diferencias entre Vercel y Cloudflare

| Aspecto               | Vercel (main)                   | Cloudflare (feature/cloudflare-pages)              |
| --------------------- | ------------------------------- | -------------------------------------------------- |
| Modelo de build       | SSR híbrido (`next build`)      | Static export (`output:'export'`) → `out/`         |
| `/api/delete-account` | Route Handler de Next (Node)    | Pages Function (`functions/api/delete-account.ts`) |
| Headers/CSP           | `headers()` en `next.config.ts` | archivo `_headers`                                 |
| Runtime del endpoint  | Serverless Node                 | Workers (fetch)                                    |
| Variables públicas    | Env de Vercel                   | Env de build de Pages                              |
| `service_role`        | Env de la función               | **Secret** de la Function                          |
| Path del cliente      | `/api/delete-account`           | `/api/delete-account` (**idéntico**)               |
| Tier comercial        | Hobby es **no-comercial**       | Free **apto para comercial**                       |

---

## Justificación técnica de la arquitectura elegida

1. **Estabilidad con Next 16.** `output:'export'` es una feature **núcleo y estable** de Next, no un adaptador. Los adaptadores (`@opennextjs/cloudflare`, `@cloudflare/next-on-pages`) suelen ir **por detrás** de las versiones de Next; con Next 16.1.7 (muy reciente) son un riesgo. El static export lo evita.
2. **La app es 99% estática.** La inspección confirma 6 rutas estáticas + 1 endpoint. No hay SSR/ISR/middleware/rutas dinámicas → no se pierde nada al exportar.
3. **Mínima superficie servidor.** Una sola Function stateless, fetch-based, sin APIs Node-only → corre nativa en Workers sin tocar lógica.
4. **Mantenibilidad.** Un modelo de build único (estático + Function) sirve **web y APK** (Capacitor ya usa `out/`), en vez del híbrido SSR de Vercel. Menos piezas, menos divergencia.
5. **Sin acoplamiento.** El path del cliente no cambia; el `service_role` sigue aislado del bundle; Supabase intacto.
6. **Reversibilidad total.** Despliegue paralelo; Vercel intacto como rollback.

---

## Archivos que se modificarán (solo en `feature/cloudflare-pages`)

1. **`next.config.ts`** — añadir `output:'export'` condicionado por env flag (no afecta dev ni main). `headers()` deja de aplicar en export → se traslada a `_headers` (no se elimina del archivo).
2. **`package.json`** — únicamente añadir `wrangler` y `@cloudflare/workers-types` como **devDependencies** (autorizadas). Posible script de build para Cloudflare (se confirma antes de añadirlo). Sin dependencias de runtime.

> **Ajuste aprobado (mantener ambas implementaciones durante la validación):** `app/api/delete-account/route.ts` **NO se elimina** todavía. Se **añade** `functions/api/delete-account.ts` (misma lógica, copiada verbatim; solo cambia la firma del handler) y ambas coexisten durante Etapas 1–2. **Restricción a considerar:** `output:'export'` es incompatible con un route handler POST en `app/`, así que la activación del export (Etapa 3, deploy) requerirá que `route.ts` no participe de ese build — esa eliminación/relocalización es la "decisión posterior". **Main conserva `route.ts` intacto en todo momento.**

## Archivos nuevos (solo en esta rama)

1. **`functions/api/delete-account.ts`** — Pages Function `onRequestPost` con la **misma** secuencia (Bearer → `getUser` anon → borrado por tablas con `service_role` → `auth.admin.deleteUser`), mismos `failedStep` y códigos.
2. **`public/_headers`** — CSP + `Cache-Control` replicando `next.config.ts`.
3. **(opcional)** `public/_redirects` si el ruteo del export lo exige (a validar).
4. **`docs/MIGRATION_PLAN_CLOUDFLARE.md`** (este documento).

## Archivos que NO se tocarán

- `lib/financialEngine.ts`, `lib/supabase.ts` (sync), `lib/auth.ts` (login/registro/sesión/OAuth).
- Cualquier `screens/*`, `components/*`, lógica de negocio.
- `public/manifest.json`, `public/sw.js` (se sirven igual; solo cambian sus headers vía `_headers`).
- `app/page.tsx` y demás páginas (salvo que una prueba lo exija → se consulta).
- **Supabase**: sin tablas, sin RLS, sin auth, sin datos migrados.
- **`main`** y el deploy de Vercel.

---

## Variables de entorno

| Variable                            | Uso                               | Dónde                                                            |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Cliente (inlined en build)        | Env de **build** de Pages                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Cliente (inlined en build)        | Env de **build** de Pages                                        |
| `NEXT_PUBLIC_APP_URL`               | URL absoluta delete-account (APK) | Env de build (Vercel durante validación; Cloudflare al conmutar) |
| Flag para activar `output:'export'` | Build estático                    | Env de build de Pages                                            |

## Secrets

| Secret                      | Uso                                 | Dónde                                                      |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en la Pages Function (borrado) | **Secret** de la Function — **jamás** en el bundle cliente |

---

## Configuración Cloudflare Pages

- Proyecto **separado** del de Vercel; rama de despliegue `feature/cloudflare-pages`.
- **Build command:** `next build` con el flag de export activo. **Output dir:** `out`.
- Env vars de build (`NEXT_PUBLIC_*` + flag). Node 18+/20+.
- **Dominio:** subdominio de pruebas (no producción) hasta validar.

## Configuración Pages Functions

- Directorio `functions/` en la raíz → detección automática.
- `functions/api/delete-account.ts` → `onRequestPost` sirve `POST /api/delete-account`.
- Binding del secret `SUPABASE_SERVICE_ROLE_KEY` a la Function.
- `@supabase/supabase-js` compatible con Workers (fetch).

## Configuración \_headers

`public/_headers` (se copia a `out/`), replicando `next.config.ts`:

```
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
  Service-Worker-Allowed: /
/manifest.json
  Cache-Control: public, max-age=0, must-revalidate
/icons/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; connect-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

> CSP copiada **exacta**. `connect-src 'self' https:` ya permite Supabase. A validar en pruebas.

## Configuración PWA

- `manifest.json` y `sw.js` se copian a `out/` y se sirven idénticos.
- **Crítico:** `sw.js` con `no-cache` vía `_headers` para que el SW siga actualizando.

## Configuración Capacitor

- **Sin cambios de comportamiento.** Ya empaqueta `out/`.
- Único contacto con host: `NEXT_PUBLIC_APP_URL` (Vercel durante validación → Cloudflare al conmutar).
- `capacitor.config.ts` (Fase 2 Android) es independiente del host web.

---

## Cambios en next.config

- Añadir `output: process.env.<FLAG> === '1' ? 'export' : undefined` (condicionado).
- `headers()` se mantiene en el archivo pero **no aplica** en export (su contenido va a `_headers`).

## Cambios en package.json

- Añadir **devDependencies** autorizadas: `wrangler`, `@cloudflare/workers-types`. **No afectan runtime de producción.**
- Posible script `build:cloudflare` → se confirma antes de añadirlo.
- **Ninguna** otra dependencia sin autorización.

---

## Compatibilidad con Next.js 16

**Alta.** `output:'export'` es núcleo estable de Next 16; la Function es nativa de Cloudflare (independiente de Next).

## Compatibilidad con Supabase

**Total.** Cliente agnóstico del host; Function fetch-based en Workers. Misma DB/RLS/auth. **Nada cambia en Supabase.**

## Compatibilidad con Capacitor

**Total.** Mismo `out/`. Solo ajusta la URL del endpoint (conmutable).

## Compatibilidad con Android

**Total.** El APK no depende del host web; único ajuste `NEXT_PUBLIC_APP_URL`.

## Compatibilidad con la PWA

**Total** si `_headers` conserva `no-cache` de `sw.js` (validado en checklist).

---

## Riesgos

| #   | Riesgo                                             | Prob.           | Mitigación / Detección                                         |
| --- | -------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| R1  | `output:'export'` falla por el route handler       | Alta (esperado) | Relocalizar la ruta a Function; export ya no contiene handlers |
| R2  | CSP en `_headers` bloquea Supabase (`connect-src`) | Media           | CSP exacta; **probar sync**; ajustar si hace falta             |
| R3  | Function con `service_role` no ejecuta en Workers  | Baja            | HTTPS puro; probar borrado real con cuenta de prueba           |
| R4  | Ruteo/clean URLs del export                        | Media           | Verificar cada ruta; `_redirects` si aplica                    |
| R5  | SW sirve versión vieja tras deploy                 | Media           | Validar `_headers` de `sw.js`; probar instalar→actualizar      |
| R6  | `NEXT_PUBLIC_*` no inyectadas en build             | Baja            | Configurar env; verificar conexión Supabase                    |
| R7  | Divergencia de la rama vs main                     | Baja            | Rama aislada; main intacta; sin fusionar hasta validar         |

## Estrategia de rollback

- **Rollback = no hacer nada.** `main`/Vercel siguen operativos e idénticos. Cloudflare es despliegue **paralelo** en subdominio de pruebas.
- Si algo falla: no se conmuta DNS ni el endpoint del APK; se sigue en Vercel.
- La rama puede abandonarse sin impacto. Supabase intacto → nada que revertir en datos.

---

## Checklist completo de pruebas

**Build / infra**

- [ ] `output:'export'` genera `out/` sin errores.
- [ ] Deploy en Cloudflare Pages (subdominio de pruebas) exitoso.
- [ ] Env de build presentes; conecta a Supabase.

**Funcional (idéntico a Vercel)**

- [ ] Login · [ ] Registro · [ ] Recuperación de sesión (`reset-password`/`auth/callback`)
- [ ] Sync (crear/leer) · [ ] Gastos · [ ] Presupuestos · [ ] Bolsillos (**sin regresión Fase 1**)
- [ ] Categorías · [ ] Configuración/perfil
- [ ] Usuario existente ve **exactamente** sus mismos datos.

**PWA**

- [ ] Instala como PWA · [ ] SW registra y **actualiza** tras nuevo deploy · [ ] CSP no rompe llamadas.

**delete-account (Function)**

- [ ] `POST /api/delete-account` responde desde Cloudflare.
- [ ] Borra datos + `auth.users` con `service_role` (cuenta de prueba).
- [ ] `failedStep`/estados idénticos · [ ] `service_role` **no** en el bundle cliente.

**Android / Capacitor**

- [ ] `BUILD_TARGET=android` genera `out/` y el APK compila.
- [ ] APK abre y funciona · [ ] delete-account desde el APK funciona.

---

## Criterios de éxito

Exitosa **solo si TODOS** se cumplen:

✓ Login · ✓ Registro · ✓ Sync · ✓ Gastos · ✓ Presupuestos · ✓ Bolsillos · ✓ Categorías · ✓ Configuración
✓ PWA instala · ✓ SW actualiza · ✓ Capacitor genera APK · ✓ Android funciona
✓ delete-account desde Cloudflare Function · ✓ Usuarios existentes mantienen todos sus datos
✓ **No fue necesario modificar la lógica de negocio**
✓ **La versión en Cloudflare Pages produce EXACTAMENTE el mismo comportamiento funcional que la versión actual en Vercel — sin ninguna diferencia observable para el usuario final.**

Hasta cumplir el checklist completo, **Cloudflare NO es el host oficial** y **Vercel permanece como producción y rollback**.

---

## Etapas de ejecución (reordenadas por el ajuste #1) — no se avanza sin aprobación en cada una

1. **Etapa 1 — Implementar la Pages Function:** crear `functions/api/delete-account.ts` (lógica verbatim) + devDep `@cloudflare/workers-types`. `route.ts` **intacto**; sin `output:'export'`. Verificar typecheck.
2. **Etapa 2 — Probar la Function localmente:** instalar `wrangler`; `wrangler pages dev`; probar el borrado con cuenta de prueba. `route.ts` sigue intacto.
3. **Etapa 3 — Static export + `_headers`:** activar `output:'export'` (condicionado) + `public/_headers` + resolver `route.ts` para el build export (decisión posterior). Verificar `out/` local.
4. **Etapa 4 — Deploy Cloudflare Pages** (subdominio de pruebas) con env/secret. Validar carga + Supabase + PWA.
5. **Etapa 5 — Validación funcional completa** (checklist) + **paridad exacta con Vercel**.
6. **Etapa 6 — Validación Android/Capacitor** contra la Function.
7. **Etapa 7 — Decisión Go/No-Go** de host oficial (no antes).
