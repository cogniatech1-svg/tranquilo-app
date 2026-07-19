# Changelog — Migración Cloudflare Pages

## RC1 (rama `feature/cloudflare-pages`, sobre `main` @ 0fee7d1)

- Migración a Cloudflare Pages (arquitectura: Static Export + Pages Function)
- Pages Function `/api/delete-account` (port 1:1 de `route.ts`, lógica sin cambios)
- `output:'export'` condicionado por `STATIC_EXPORT=1` (Vercel intacto sin el flag)
- Static Export validado (`out/` generado; ruta API excluida automáticamente)
- Runtime de Cloudflare validado (`wrangler pages dev`)
- Paridad funcional con Vercel comprobada (401 / 200 idénticos)
- E2E completo contra Supabase real (datos + usuario de auth eliminados)
- `public/_headers` (CSP + Cache-Control, réplica de `next.config.ts`)
- Deploy Preview local validado (estático + PWA + manifest + sw + Function)
- Prueba de regresión oficial: `scripts/e2e/delete-account.mjs`
- Rollback documentado (Vercel permanece como producción)
- `route.ts` intacto · `main` intacta

### Pendiente

- Deploy Preview hospedado (`*.pages.dev`) — requiere `wrangler login`
- Configuración de secrets en el proyecto Pages
- Build Android (Fase 2, separado)

### devDependencies añadidas (autorizadas, no runtime)

- `wrangler`
- `@cloudflare/workers-types`
