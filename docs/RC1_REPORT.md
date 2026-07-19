# RC1 — Informe de Migración a Cloudflare Pages

> Estado: **Release Candidate 1 (RC1)** de la capa web/Cloudflare. Sin desplegar. Vercel sigue en producción.
> Rama: `feature/cloudflare-pages` (3 commits sobre `main` @ `0fee7d1`).

---

## Resumen ejecutivo

Se construyó una segunda infraestructura de hosting para Tranquilo sobre **Cloudflare Pages**, en paralelo y sin afectar la versión en Vercel. La arquitectura es **Static Export + Cloudflare Pages + una única Pages Function** (`/api/delete-account`). **No se modificó la lógica de negocio**, la autenticación, la sincronización ni el motor financiero. Supabase es la misma; no hubo migración de datos. La paridad funcional con Vercel se validó con pruebas runtime y un E2E completo contra Supabase real. La migración queda en **RC1**, lista para el primer Deploy Preview hospedado (pendiente de `wrangler login` del owner).

---

## Cronología

1. Documento de plan (`MIGRATION_PLAN_CLOUDFLARE.md`) + inspección de viabilidad (sin impedimentos).
2. **Etapa 1** — Implementación de la Pages Function (port 1:1 de `route.ts`).
3. **Etapa 2** — Validación runtime + E2E contra Supabase real; paridad con Vercel.
4. Experimento de build — descubrimiento clave: `output:'export'` no falla; excluye la ruta API automáticamente.
5. **Etapa 3** — `output:'export'` condicional + `public/_headers` + Deploy Preview local.
6. Documentación de cierre (este informe + arquitectura + runbook + changelog).

---

## Etapas realizadas

| Etapa                        | Commit    | Entregable                                                                                       |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| 1 — Pages Function           | `9964d83` | `functions/api/delete-account.ts` + `functions/tsconfig.json` (tipos Workers aislados)           |
| 2 — Validación runtime + E2E | `f554f1a` | `wrangler` (devDep) + `scripts/e2e/delete-account.mjs` (regresión oficial) + `.dev.vars.example` |
| 3 — Static export + headers  | `7dd2944` | `output:'export'` (flag `STATIC_EXPORT=1`) + `public/_headers`                                   |

Dependencias añadidas (devDependencies, autorizadas): `@cloudflare/workers-types`, `wrangler`. **Ninguna dependencia de runtime.**

---

## Resultados obtenidos

- Pages Function implementada como **port verbatim** de `route.ts` (misma secuencia, mismos `failedStep`, mismos códigos HTTP; solo cambia el framework: `onRequestPost`, `context.env`, `Response`).
- `route.ts` **intacto**; ambas implementaciones coexisten (Vercel usa el Route Handler, Cloudflare la Function).
- Static export funcional; la ruta API se excluye automáticamente del `out/` sin error.
- `public/_headers` replica exacto la CSP y los `Cache-Control` de `next.config.ts`.

---

## Pruebas ejecutadas

### Paridad con Vercel (comparación directa en vivo)

| Caso           | Cloudflare Function                                       | Vercel                      | ¿Idéntico?             |
| -------------- | --------------------------------------------------------- | --------------------------- | ---------------------- |
| Sin token      | `401 {"success":false,"failedStep":"auth_missing_token"}` | (por código)                | ✅                     |
| Token inválido | `401 {"success":false,"failedStep":"auth_invalid_token"}` | `401 {…auth_invalid_token}` | ✅ (comparado en vivo) |
| Éxito          | `200 {"success":true}`                                    | (por código)                | ✅                     |

### Resultados del E2E (Supabase real, cuenta sintética self-cleaning)

```
1. Usuario de prueba: cf53a305-…
3. Filas ANTES:   {"pockets":2,"monthly_records":1,"users":1}
4. delete-account → HTTP 200 {"success":true}
5. Filas DESPUÉS: {"pockets":0,"monthly_records":0,"users":0}
6. Re-login tras borrado: falla (auth eliminado)
✅ E2E PASÓ
```

Cubre: crear usuario → sesión → crear datos → delete-account vía Function → **eliminación completa de datos** + **usuario de Supabase Auth eliminado** + **respuesta HTTP idéntica**.

### Resultados del Static Export

- `STATIC_EXPORT=1 npm run build` → exit **0**.
- `out/` con las 8 rutas estáticas + `_headers` + `manifest.json` + `sw.js` + assets.
- `/api/delete-account` **ausente** de `out/` (excluida correctamente).

### Resultados del Deploy Preview local (runtime real de Cloudflare, `wrangler pages dev out/`)

| Checkpoint                                  | Resultado                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Sitio estático `GET /`                      | ✅ 200 `text/html`                                                           |
| `manifest.json`                             | ✅ 200 · `application/manifest+json` · `no-cache`                            |
| `sw.js`                                     | ✅ 200 · `application/javascript` · `no-cache` · `Service-Worker-Allowed: /` |
| CSP aplicada                                | ✅ `connect-src 'self' https:` (Supabase permitido)                          |
| Pages Function                              | ✅ `POST /api/delete-account` → `401 auth_missing_token`                     |
| Rutas `/privacy` `/terms` `/reset-password` | ✅ 200                                                                       |

---

## Paridad con Vercel

**Sin diferencias observables.** Los headers coinciden exacto; la Function responde idéntico en éxito y error; el borrado de datos y de auth es equivalente.

---

## Riesgos restantes

| Riesgo                                       | Severidad | Nota                                                                                                                                                   |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deploy hospedado aún no ejecutado            | Media     | Requiere `wrangler login` del owner (Opción A). El preview local ya cubre lo funcional.                                                                |
| Secrets no configurados en el proyecto Pages | Media     | La Function requiere las 3 variables en el proyecto (ver runbook).                                                                                     |
| CSP en producción hospedada                  | Baja      | Validada localmente; reconfirmar en el preview hospedado.                                                                                              |
| Canal Android no construido                  | Media     | No es regresión de la migración: **nunca existió sobre `main`**. La migración es compatible (el APK consume `out/`), pero el APK es trabajo de Fase 2. |
| Actualización del SW en el edge real         | Baja      | `_headers` fuerza `no-cache`; reconfirmar tras un segundo deploy hospedado.                                                                            |

---

## Trabajo pendiente

1. `wrangler login` (owner) → primer Deploy Preview hospedado + configurar secrets.
2. Validación del checklist en el preview hospedado (`*.pages.dev`).
3. **Fase 2 (separada):** construir Capacitor limpio y generar el APK (no es parte de esta migración).
4. Decisión Go/No-Go de host oficial (no antes de completar 1–2).

---

## Recomendación final

La migración está **técnicamente lista para el primer Deploy Preview hospedado**. La evidencia (paridad directa + E2E + preview local con el runtime real de Cloudflare) reduce el riesgo a la configuración del proyecto hospedado (secrets/CSP), no a la lógica. **Recomendación:** proceder con el Deploy Preview hospedado (Opción A), validar el checklist del runbook en `*.pages.dev`, y **solo entonces** evaluar el corte a producción. **No** promover Cloudflare a host oficial ni retirar Vercel hasta completar esa validación. El canal Android se aborda por separado en Fase 2.
