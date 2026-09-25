# صِلة (Sila) · Frontend

React 19 + Vite + TypeScript. Gold marketplace for the Iraqi market (Arabic, RTL).

- Product docs: `Sila/Product/` · UI Kit: `Sila/UI Kit/UI Kit/`
- Work plan and status: [`PLAN.md`](PLAN.md) · design decisions: [`DECISIONS.md`](DECISIONS.md)

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

### Backend or mock

The frontend follows `Sila-Backend/docs/api/API_CONTRACT.md` exactly. Types come from the backend's
`openapi.json`: after an API change run `npm run api:types` (writes `src/lib/api/schema.d.ts`).

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Backend root, without `/api` (default `http://localhost:8010`) |
| `VITE_USE_MOCK` | `true` = in-browser mock that speaks the same contract (paths, JSON, errors, rules) |

`.env.local` points at the real backend. Start it first:

```bash
cd ../Sila-Backend
docker compose up --build                             # API on http://localhost:8010
docker compose exec api python -m app.scripts.seed    # demo data (refuses a non-empty DB)
```

The backend allows the origin `http://localhost:5173` only (CORS), so keep the dev server on that port.
With `VITE_USE_MOCK=false` there is no fallback: a stopped backend shows a connection error.

**Demo accounts** (API_CONTRACT §7, password `Sila@2026`), one-click on the login page in mock mode
and dev builds. The mock seeds the same people and data.

| Email | Role | State |
|---|---|---|
| `zainab@sila.iq` | investor | KYC verified, Premium active, has holdings |
| `haider@sila.iq` | investor | KYC verified, free, large holdings |
| `ali@sila.iq` | investor | **not KYC-verified** (the KYC interrupt) |
| `sara@sila.iq` | investor | Premium **expired** (the upgrade flow) |
| `karrada@sila.iq` | seller | مجوهرات الكرّادة, KYC verified, promoted listing |
| `nahr@sila.iq` | seller | صاغة شارع النهر, a sold-out and a suspended listing |
| `mansour@sila.iq` | seller | ذهب المنصور, **not KYC-verified** (the publish interrupt) |

Mock only: to demo the tampered-balance state, `localStorage.setItem('sila-mock-integrity-fail', '1')` in the console, then open **محفظتي**.

To see loading and error states (mock mode, browser console, then reload):

| Switch | Effect |
|---|---|
| `localStorage.setItem('sila-mock-latency', '3000')` | Every response waits 3 seconds (skeletons, busy buttons) |
| `localStorage.setItem('sila-mock-fail', '/listings')` | Requests whose path contains `/listings` return a 500 |

`localStorage.removeItem(...)` turns a switch off.

## Quality

```bash
npm run check        # typecheck + ESLint + Prettier + UI Kit gates + unit tests
npm run test:e2e     # Playwright journeys 01 → 08 on the mock (uses the installed Microsoft Edge)
npm run build
```

- `npm run qa` runs the UI Kit automated gates (hex only in `tokens.css`, no gradients, no dashes, no arbitrary Tailwind values, Phosphor weights and sizes, and so on).
- Styling uses Kit tokens only: `src/styles/tokens.css` (values) mapped to Tailwind utilities in `src/styles/tailwind.css`.
- UI copy lives in `src/i18n/ar.ts`.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm run check`, a production build and the E2E suite on every push to `main` and every pull request.

## Deploy (Vercel + Railway)

The frontend deploys on Vercel from this repository; `vercel.json` sets the Vite build, the SPA fallback (every route serves `index.html`, so deep links like `/app/market` work) and long caching for hashed assets. Every push to `main` redeploys.

Environment variables (Vercel → Project → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `VITE_API_URL` | The Railway backend URL, e.g. `https://<service>.up.railway.app` (no trailing `/api`) |
| `VITE_USE_MOCK` | Leave unset. `true` only for a demo deploy with no backend (demo data, quick-login buttons shown) |

A production build refuses to start without `VITE_API_URL` unless `VITE_USE_MOCK=true`, so a misconfigured deploy fails loudly instead of calling `localhost` from visitors' browsers. `VITE_*` values are baked in at build time: after changing one, redeploy.

On the BACKEND (Railway), `CORS_ORIGINS` must list the Vercel domain (e.g. `https://<project>.vercel.app`), or the browser blocks every API call.
