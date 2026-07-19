# Runbook de Despliegue — Tranquilo en Cloudflare Pages

> Procedimiento completo para el **primer despliegue** en Cloudflare Pages.
> Pensado para que un desarrollador nuevo pueda desplegar sin preguntar nada.
> Rama a desplegar: `feature/cloudflare-pages`. **No** desplegar `main` en Cloudflare.

---

## 0. Requisitos previos

- Node 18+/20+ y el repo clonado en `feature/cloudflare-pages`.
- `npm install` ejecutado (incluye `wrangler` como devDependency).
- Acceso a la cuenta de Cloudflare del proyecto.
- Los 3 valores de Supabase a mano (URL, anon key, service_role key) — están en `.env.local`.

---

## 1. Autenticarse en Cloudflare

```bash
npx wrangler login
```

Abre el navegador, autoriza, y confirma con:

```bash
npx wrangler whoami
```

Debe mostrar el email/cuenta. Si dice "not authenticated", repetir.

---

## 2. Generar el build estático

Desde la raíz del proyecto:

```bash
STATIC_EXPORT=1 npm run build
```

- Genera el directorio **`out/`**.
- Verás el warning `headers will not automatically work with output: export` — **es esperado** (los headers los sirve `public/_headers`, ya copiado a `out/_headers`).
- La ruta `/api/delete-account` NO aparece en `out/` — **es correcto** (la sirve la Pages Function).

Verificar:

```bash
ls out/index.html out/_headers out/manifest.json out/sw.js   # deben existir
```

---

## 3. Crear el proyecto Pages y desplegar (primer deploy)

```bash
npx wrangler pages deploy out --project-name=tranquilo
```

- En el primer deploy, wrangler crea el proyecto `tranquilo` (o el nombre elegido).
- Sube el contenido de `out/` **y** detecta automáticamente el directorio `functions/` (la Pages Function).
- Devuelve una URL `https://<hash>.tranquilo.pages.dev` (Deploy Preview).

> Para un preview aislado se puede usar `--branch=preview`. Para producción Cloudflare, `--branch=main` del proyecto Pages (NO confundir con la rama git).

---

## 4. Configurar variables de entorno (build) y secrets (Function)

La Function necesita 3 valores. Configurarlos en el proyecto Pages.

### Vía CLI (secrets de la Function)

```bash
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name=tranquilo
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=tranquilo
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=tranquilo
```

(Pega el valor cuando lo pida; no queda en el historial de shell.)

### Vía Dashboard (alternativa)

Cloudflare Dashboard → Workers & Pages → `tranquilo` → Settings → Environment variables / Secrets:

- `NEXT_PUBLIC_SUPABASE_URL` (Plaintext)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Plaintext)
- `SUPABASE_SERVICE_ROLE_KEY` (**Secret / Encrypted**)

> Nota: los `NEXT_PUBLIC_*` ya quedaron inlineados en el `out/` construido localmente. Se configuran también en el proyecto para que la **Function** los lea en runtime. El `SUPABASE_SERVICE_ROLE_KEY` es **exclusivo de la Function** y debe ir como Secret.

### Redeploy tras configurar secrets

```bash
npx wrangler pages deploy out --project-name=tranquilo
```

---

## 5. Validar el despliegue (checklist)

Sea `URL` la del Deploy Preview (`https://<hash>.tranquilo.pages.dev`):

```bash
# Sitio estático
curl -s -o /dev/null -w "%{http_code}\n" $URL/                      # 200
# PWA
curl -sD - -o /dev/null $URL/manifest.json | grep -i "content-type\|cache-control"
curl -sD - -o /dev/null $URL/sw.js | grep -i "cache-control\|service-worker-allowed"
# CSP
curl -sD - -o /dev/null $URL/ | grep -i "content-security-policy"
# Pages Function (sin token → 401 esperado)
curl -s -X POST $URL/api/delete-account                             # {"success":false,"failedStep":"auth_missing_token"}
```

Validación funcional en navegador:

- [ ] Abre `/` y navega.
- [ ] Login / registro / recuperación de sesión.
- [ ] Sync con Supabase (crear gasto/bolsillo/presupuesto).
- [ ] Instalar como PWA; verificar que el SW actualiza en un segundo deploy.
- [ ] Ciclo de bolsillos **sin regresión** (borrar bolsillo → recargar → no reaparece).
- [ ] Eliminación de cuenta (con cuenta de prueba) → datos y usuario eliminados.

Regresión automatizada de la Function (con la Function local o apuntando al preview):

```bash
# Local:
npx wrangler pages dev out --port 8788 --compatibility-date=2024-09-23   # en otra terminal
node scripts/e2e/delete-account.mjs
# Contra el preview hospedado:
E2E_FN_URL="$URL/api/delete-account" node scripts/e2e/delete-account.mjs
```

---

## 6. Rollback

**No requiere acción sobre producción.** Vercel (`main`) sigue sirviendo intacto.

- Si el preview falla: no conmutar DNS ni el endpoint del APK; seguir en Vercel.
- Para deshacer el proyecto Pages: eliminarlo desde el dashboard (no afecta Vercel ni Supabase).
- Supabase intacto → sin rollback de datos.

---

## 7. Corte a producción (SOLO tras aprobación)

Cuando la migración se apruebe como host oficial:

1. Asignar el dominio de producción al proyecto Pages (Custom domain).
2. Actualizar `NEXT_PUBLIC_APP_URL` (para el APK) al dominio Cloudflare.
3. Conmutar DNS.
4. Mantener Vercel operativo unos días como rollback antes de retirarlo.
