# Task: apply Sila's new brand mark across the frontend

You are working in the `sila-frontend` repo (React 19 + Vite + TypeScript, Arabic RTL, Tailwind mapped to `src/styles/tokens.css`). Sila has a **new logo**. Replace the old logo everywhere and update the docs that describe it. Read `README.md`, `DECISIONS.md` and `Sila/UI Kit/UI Kit/05-logo-usage.md` before you start.

## What changes and what does not

**Changes:** the logo only (the mark, icon, favicon, app icons, OG image) and anything that was built from the old logo's shapes.

**Does NOT change:** colours, fonts, spacing, radii, motion tokens. Leave `src/styles/tokens.css` and `src/styles/tailwind.css` untouched. Fonts stay Montserrat (Latin + numbers) and IBM Plex Sans Arabic (Arabic).

## The new logo

- A single **symbol, no wordmark**: an infinity loop cut by one slanted stroke (the same 20° slant motif already in the UI Kit). Read right to left, the shape also spells صِلة (ص, ل, ة). The brand does NOT put the word "صِلة" next to it.
- Meaning: an unbroken connection between investors and sellers, plus a currency-like stroke that signals money and value.
- Proportions: horizontal, **1000 × 449.91** (about 2.22 : 1). There is no 3:1 lockup any more.
- Colours: **Navy `#023047` on light surfaces, White on dark surfaces** (same rule as today). Gold `#FFB703` and Black `#05131C` versions exist for print and marketing only, not in the app UI.
- Clear space: **x = ¼ of the mark's height** on every side.
- Minimum size: **48 px wide** on screen, **15 mm** in print. Below that the slash disappears.
- Misuse: do not stretch, rotate, recolour, add shadows or effects, fade it, or put it on low-contrast backgrounds.
- Primary app icon: **navy mark on white**. Alternates: white on navy, navy on gold.

## Source files (already in this repo)

All new assets are in `Sila/Brand/Sila-Logo-Kit/`:

| File | Use |
|---|---|
| `SVG/sila-mark.svg` | Main mark, `fill="currentColor"`, viewBox `0 0 1000 449.91` |
| `SVG/sila-icon.svg` | Mark centred in a 1:1 square, `currentColor` |
| `SVG/sila-mark-{navy,white,gold,black}.svg` | Fixed-colour versions |
| `SVG/sila-app-icon-*.svg`, `PNG/app-icon/*` | App icons |
| `web/favicon.svg`, `web/favicon-{16,32,48}.png` | Favicons |
| `web/apple-touch-icon.png` (180), `web/icon-192.png`, `web/icon-512.png` | Touch / PWA icons |
| `web/og-image.png` (1200 × 630) | Social preview |
| `Sila-Brand-Identity.pdf` | Full brand guidelines (reference) |

## Steps

1. **Replace the brand SVGs, keeping the file names** so imports keep working:
   - `src/assets/brand/sila-logo.svg` ← contents of `SVG/sila-mark.svg`
   - `src/assets/brand/sila-icon.svg` ← contents of `SVG/sila-icon.svg`
   - Same two files in `public/brand/`, and the same two in `Sila/Sila Logo/` (replace the old files there).
   - Keep `fill="currentColor"` and no hard-coded hex in anything under `src/` (the QA gate allows hex only in `tokens.css`).
   - Add `data-piece="1"`, `"2"`, `"3"` to the three `<path>` elements in `src/assets/brand/sila-icon.svg` (see step 4).

2. **`src/components/ui/Logo.tsx`**
   - Width for `variant="full"` becomes `Math.round(height * 1000 / 449.91)` instead of `height * 3`. Update the comment (`Full logo 3:1 (1320×440)` is wrong now).
   - Re-check the allowed `height` values against the new minimum (48 px wide ⇒ full mark height ≥ 22 px). Drop sizes that break the minimum and fix any call sites.
   - Keep the `tone` logic (navy / white / auto) as it is.
   - Since the mark is wide, `variant="icon"` (square box) renders it small. At every call site, decide whether the full mark at a smaller height reads better than the square icon, and switch where it does (likely: collapsed sidebar, mobile tab bar, page loader).

3. **Check every place the logo renders** and fix sizing and alignment: `LandingNav`, `Topbar`, `Sidebar` (expanded and collapsed), `MobileTabBar`, `AppLayout`, `AuthShell`, `PageLoader`, `NotFoundPage`, `FinalCta`, `DemoScreens`, `KycModal`, `SettingsPage`, `SessionExpiredDialog`. Use `grep -rn "Logo\|sila-icon\|sila-logo" src` to make sure nothing is missed.

4. **`src/features/landing/BrandMark.tsx`**: the scroll animation assembled the old "four around one" pieces. Rewrite it for the new mark's three paths: the two halves of the infinity slide in from opposite sides and meet in the centre, then the slash drops in along its own 20° angle. Keep the GSAP scrub, keep `prefers-reduced-motion` showing the static mark, and update the comment and the i18n copy for that section (`src/i18n/ar.ts`, `src/i18n/en.ts`) if it describes four bars or squares.

5. **Square motifs**: `LoadingSquares` and the square chart markers were justified as "the logo's squares". Keep them visually as they are (they still fit the system), but fix the comments and docs that say they come from the logo.

6. **`index.html`**
   - Copy `web/favicon.svg` to `public/favicon.svg`. Copy `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.png` into `public/`.
   - Add `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, and Open Graph / Twitter tags pointing at `/og-image.png` (title and description from the existing `<title>` and meta description).
   - Keep `theme-color` as it is.

7. **Docs**
   - Rewrite `Sila/UI Kit/UI Kit/05-logo-usage.md` for the new mark: concept and meaning, the ص‑ل‑ة reading, versions, colour rules, clear space, minimum sizes, misuse list, app icon rules, file list.
   - In `06-visual-style-fintech.md`, update the "three motifs come from the logo" section: the 20° slant stays (it is in the new mark), the "four bars around a centre" motif goes, squares stay as a system choice.
   - Add a dated entry to `DECISIONS.md`: "New brand mark (infinity + slash), replaces the bars-and-squares logo; colours and fonts unchanged."

## Done when

- `npm run check` passes (typecheck, ESLint, Prettier, UI Kit QA gates, unit tests).
- `npm run test:e2e` passes and `npm run build` succeeds.
- No reference to the old logo remains (`grep` for `four around one`, `1320×440`, `3:1`, `data-kind="bar"`, `data-kind="square"`).
- You have looked at screenshots of: the landing page (light and dark), the app shell with the sidebar expanded and collapsed, the login page, and the mobile layout at 390 px wide. The mark is crisp, correctly coloured for the surface, never below 48 px wide, and has its clear space.

Work on a new branch, commit in small steps, and finish with a short summary of what changed and any call site where you chose the full mark over the square icon.
