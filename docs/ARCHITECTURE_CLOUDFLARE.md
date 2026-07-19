# Arquitectura — Tranquilo en Cloudflare Pages

## Objetivo

Servir Tranquilo desde Cloudflare Pages como sitio estático + una única Pages Function, sin cambiar la lógica de negocio y manteniendo la misma Supabase. Vercel permanece como producción y rollback hasta validación total.

---

## Arquitectura final

```
Usuario
        │
        ▼
Cloudflare Pages
        │
        ├──────────────► Pages Function (/api/delete-account)
        │                         │
        ▼                         ▼
 Sitio estático             Supabase Auth
        │                         │
        ▼                         ▼
       PWA                Supabase Database
```

- El **sitio estático** (`out/`) y la **PWA** (manifest + service worker) se sirven directo desde Cloudflare Pages.
- Toda la lógica financiera es **client-side**: la app habla directo con **Supabase Auth** y **Supabase Database** usando el anon key.
- La **Pages Function** interviene **solo** en el borrado de cuenta, porque requiere `service_role` (secreto que jamás puede ir al cliente).
- **Supabase es la misma** que usa Vercel. Sin migración de datos.

---

## Flujo de compilación

### Vercel (producción actual — rama `main`)

```
npm run build
        ↓
Next.js normal (SSR híbrido)
        ↓
Route Handler  (app/api/delete-account/route.ts)
        ↓
Producción (Vercel)
```

### Cloudflare (rama `feature/cloudflare-pages`)

```
STATIC_EXPORT=1 npm run build
        ↓
out/  (static export; la ruta API se excluye automáticamente)
        ↓
Cloudflare Pages
        ↓
Pages Function  (functions/api/delete-account.ts)
```

> Un solo `next.config.ts` sirve ambos flujos: el flag `STATIC_EXPORT=1` activa `output:'export'`. Sin el flag, build normal de Vercel.

---

## Variables de entorno

| Variable                        | Tipo                              | Uso                                                              |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Pública** (inlined en el build) | Cliente Supabase                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Pública** (inlined en el build) | Cliente Supabase                                                 |
| `NEXT_PUBLIC_APP_URL`           | **Pública**                       | URL absoluta que usa el APK para llamar a delete-account         |
| `STATIC_EXPORT`                 | **Pública** (solo build)          | Flag para activar `output:'export'`                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | **SECRET**                        | Solo dentro de la Pages Function (borrado). Nunca en el cliente. |

## Secrets necesarios

Para que la Pages Function opere, el proyecto de Cloudflare Pages debe tener configurados:

```
NEXT_PUBLIC_SUPABASE_URL          (env de build)
NEXT_PUBLIC_SUPABASE_ANON_KEY     (env de build)
SUPABASE_SERVICE_ROLE_KEY         (secret de la Function)
```

> Los `NEXT_PUBLIC_*` quedan inlineados en el bundle al construir; el `service_role` se lee en runtime dentro de la Function.

---

## Cómo desplegar en Cloudflare

Ver el procedimiento detallado en [`DEPLOY_RUNBOOK.md`](./DEPLOY_RUNBOOK.md). Resumen:

1. `npx wrangler login`
2. `STATIC_EXPORT=1 npm run build` → genera `out/`
3. `npx wrangler pages deploy out --project-name=tranquilo` (primer deploy crea el proyecto)
4. Configurar las 3 variables/secrets en el proyecto de Pages
5. Validar con el checklist del runbook

---

## Cómo volver a Vercel (rollback completo)

**El rollback es no hacer nada.** Vercel sigue sirviendo desde `main`, intacto, durante toda la migración.

- No se conmuta DNS a Cloudflare hasta validación total.
- El APK (cuando exista) mantiene `NEXT_PUBLIC_APP_URL` apuntando a Vercel hasta decidir el corte.
- Para abandonar la migración: no promover el proyecto Cloudflare; `feature/cloudflare-pages` puede quedar sin fusionar. `main` y Vercel no requieren ningún cambio.
- Supabase no se toca → no hay nada que revertir en datos.

---

## Riesgos conocidos

| Riesgo                                     | Estado / Mitigación                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| CSP en `_headers` podría bloquear Supabase | Mitigado: CSP copiada exacta; `connect-src 'self' https:` valida Supabase; probado en preview local |
| Function con `service_role` en Workers     | Validado en preview local + E2E; requiere secret configurado en el proyecto                         |
| SW sirve versión vieja tras deploy         | Mitigado: `_headers` fuerza `no-cache` en `sw.js`; probado                                          |
| Deploy hospedado aún no ejecutado          | Pendiente `wrangler login` del owner (Opción A)                                                     |
| Canal Android no construido en esta línea  | Fase 2 separada; la migración es compatible (el APK consume `out/`) pero el APK aún no existe       |

---

## Decisiones arquitectónicas

**¿Por qué `route.ts` permanece?**
Vercel (producción) lo necesita como Route Handler serverless. Se demostró que `output:'export'` lo excluye automáticamente del build estático sin error, así que **no hay conflicto**: coexiste con la Function. Un solo código base sirve ambos hosts.

**¿Por qué Cloudflare usa únicamente la Pages Function?**
En static export no hay servidor Next; la única lógica que requiere servidor (borrado con `service_role`) se implementa como Pages Function nativa de Cloudflare — el path `/api/delete-account` es idéntico, así que el cliente no cambia.

**¿Por qué `output:'export'` es condicional?**
Si fuera incondicional, el build de Vercel también excluiría la ruta API y `main` perdería `delete-account`. El flag `STATIC_EXPORT=1` lo activa solo para el build de Cloudflare/Android, preservando Vercel.

**¿Por qué `_headers` sustituye a `headers()`?**
En static export, `headers()` de Next **no se aplica** (Next lo advierte). Cloudflare Pages sirve los headers vía el archivo `public/_headers`, que replica exacto la CSP y los `Cache-Control` de `next.config.ts` (crítico para la actualización del service worker y para permitir Supabase en la CSP).
