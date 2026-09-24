# Sila (صِلة) UI Kit · 02 · Typography System

> Arabic is the primary language (`<html lang="ar" dir="rtl">`). English is a full second locale (`lang="en" dir="ltr"`).
> Goal: text that is calm, readable for a 30 to 60 year old investor, with **no crowded line spacing, no broken words, no one-word last lines**, especially in Arabic.

---

## 1. Families

| Script | Family | Why |
|---|---|---|
| Arabic | **IBM Plex Sans Arabic** | Clear, open counters, engineered for UI, pairs with a technical/financial voice |
| Latin + all digits | **Montserrat** (variable) | Geometric, confident, wide; strong for numbers and English UI |

### 1.1 One font stack for the whole product
```css
--font-sans: "Montserrat", "IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", sans-serif;
```
Montserrat is loaded **with a Latin-only `unicode-range`**, so:
- Arabic letters and Arabic punctuation (`، ؛ ؟`) fall through to IBM Plex Sans Arabic.
- Latin words, digits, `%`, `+`, `-`, `,`, `.` render in Montserrat, even inside Arabic sentences.
This means every number in the product (prices, grams, percentages) is Montserrat with tabular figures, in both locales. One number style everywhere.

### 1.2 Loading (React SPA)
Self-host, no Google Fonts request at runtime:
```bash
npm i @fontsource/ibm-plex-sans-arabic @fontsource-variable/montserrat
```
```ts
// src/styles/fonts.ts
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource-variable/montserrat/wght.css"; // latin subsets carry unicode-range
```
- `font-display: swap` (fontsource default).
- Preload the two files used above the fold (Plex Arabic 500 + Montserrat variable latin) with `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
- Add a metric-matched fallback to avoid layout shift (CLS < 0.1):
```css
@font-face {
  font-family: "Plex Arabic Fallback";
  src: local("Segoe UI"), local("Tahoma"), local("Arial");
  size-adjust: 104%; ascent-override: 102%; descent-override: 42%; line-gap-override: 0%;
  unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF;
}
```
(The agent must tune the override numbers by comparing both renders at 16px; target: zero visible jump on swap.)

### 1.3 Mixing ratio (Latin inside Arabic)
Montserrat has a large x-height and looks about 6% bigger than Plex Arabic at the same `font-size`. Inside Arabic running text, Latin words and digits get:
```css
:lang(ar) .latin-run, :lang(ar) bdi.num { font-size: 0.94em; }
```
Big stand-alone figures (prices, KPIs) are NOT reduced: they are designed at their own size.

---

## 2. Weights (only these, nothing else)

| Weight | Plex Arabic | Montserrat | Used for |
|---|---|---|---|
| 400 Regular | yes | yes | Body text, table cells, descriptions |
| 500 Medium | yes | yes | UI labels, buttons, nav items, table headers, input text |
| 600 SemiBold | yes | yes | Headings h2 to h4, card titles, key numbers |
| 700 Bold | yes | yes | Display, h1, the live price hero figure |

Banned: 100, 200, 300 (too thin for the audience and for navy-on-white at small sizes), 800, 900 (shouty). Arabic has **no italic**, so emphasis is weight (500 → 600) or color (`--text-primary` vs `--text-secondary`), never italic, never underline (underline = link).

---

## 3. Type Scale · Golden Ratio

Ratio per step = **√φ = 1.272**, so every **two steps = φ (1.618)**. Base = 16px.

`12.6 · 16 · 20.4 · 25.9 · 32.9 · 41.9 · 53.3 · 67.8 · 86.2` → snapped to whole pixels.

Line heights are snapped to the **4px grid**. Arabic gets taller lines than Latin at every step because of ascenders, descenders, dots and harakat (for example the kasra in "صِلة").

| Token | Size | Line height (Arabic) | Line height (Latin) | Weight | Letter spacing (Latin only) | Use |
|---|---|---|---|---|---|---|
| `display-2xl` | 86px | 108px (1.26) | 92px (1.07) | 700 | -0.02em | Landing hero only (desktop ≥ 1280) |
| `display-xl` | 68px | 88px (1.29) | 76px (1.12) | 700 | -0.02em | Landing hero (1024 to 1279), big landing statements |
| `display-lg` | 53px | 72px (1.36) | 60px (1.13) | 700 | -0.015em | Landing section titles, live price hero figure |
| `h1` | 42px | 60px (1.43) | 48px (1.14) | 700 | -0.01em | Page title (app), mobile hero |
| `h2` | 33px | 48px (1.45) | 40px (1.21) | 600 | -0.01em | Section title, KPI hero number |
| `h3` | 26px | 40px (1.54) | 36px (1.38) | 600 | 0 | Card group title, modal title |
| `h4` / `body-xl` | 20px | 36px (1.8) | 32px (1.6) | 600 / 400 | 0 | Card title, landing body |
| `body` | 16px | 28px (1.75) | 26px (1.625 ≈ φ) | 400 | 0 | Default app text |
| `label` | 16px | 24px | 24px | 500 | 0 | Buttons (md/lg), inputs, nav |
| `body-sm` | 14px (Arabic) / 13px (Latin) | 24px | 20px | 400 | 0.005em | Helper text, table secondary line, captions |
| `overline` | 13px | n/a | 16px | 600 | 0.08em, uppercase | **Latin only.** Arabic never uses overline style |

Minimums (hard):
- Arabic text: **14px**. Latin text: **13px**. Nothing smaller anywhere, including chart axis labels and legal footers.
- Body text in the app: 16px. Body text on the landing page: 20px (`body-xl`).
- Inputs: 16px (prevents iOS zoom and is right for the audience).

### 3.1 Responsive steps
| Token | < 640 | 640 to 1023 | 1024 to 1279 | ≥ 1280 |
|---|---|---|---|---|
| Landing hero | `h1` 42 | `display-lg` 53 | `display-xl` 68 | `display-2xl` 86 |
| Landing section title | `h2` 33 | `h1` 42 | `display-lg` 53 | `display-lg` 53 |
| App page title | `h3` 26 | `h2` 33 | `h2` 33 | `h1` 42 |
| Body | 16 | 16 | 16 | 16 |

Steps jump by scale tokens only. No `clamp()` with arbitrary vw values, because fluid sizes produce in-between sizes that break the ratio and the 4px line grid.

---

## 4. Numbers (the heart of a fintech UI)

### 4.1 Rendering
```css
.num, [data-num] {
  font-family: "Montserrat", sans-serif;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  unicode-bidi: isolate;
  direction: ltr;
}
```
- Tabular figures on every number that can change or sits in a column (prices, weights, totals, tables, tickers). Digits never jitter when a price ticks.
- The agent must visually verify `tnum` is active (render `1111` above `0000`: widths must match). If the installed Montserrat build lacks `tnum`, wrap each digit in a fixed-width cell (`width: 0.62em; text-align: center`) inside animated tickers only.
- Numbers are always wrapped in `<bdi>` (or `.num`) so RTL never flips signs, separators or units.

### 4.2 Digits & formatting
- Digits: **Western Arabic numerals (0 to 9) in both locales**. This is the norm for banking and price boards in Iraq and prevents mixed digit systems.
- Use `Intl.NumberFormat` only, never string concatenation:
```ts
export const fmtIQD = (v: number) =>
  new Intl.NumberFormat("ar-IQ", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(v);
export const fmtUSD = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
export const fmtGrams = (v: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(v);
export const fmtPct = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, signDisplay: "exceptZero" }).format(v);
```
- Currency: `1,284,500 د.ع` in Arabic, `IQD 1,284,500` in English. The unit is smaller and lighter than the figure:
  - Figure: token size, weight 600, `--text-primary`.
  - Unit: 0.62em (≈ 1/φ), weight 500, `--text-tertiary`, gap 4px.
- Grams: `12.500 غ` / `12.500 g`. Karat: `عيار 21` / `21K`.
- Signs: `+0.84%` / `-1.27%` using a real minus in display (`−`) for prices; hyphen-minus is fine in inputs.
- Large KPIs may use compact notation only when the exact value is one tap away: `1.28M د.ع`.

### 4.3 Number hierarchy
| Role | Token | Weight |
|---|---|---|
| Live gold price (hero figure) | `display-lg` 53px | 700 |
| KPI value (portfolio total, grams owned) | `h2` 33px | 600 |
| Card price (listing) | `h3` 26px | 600 |
| Table numbers | `body` 16px | 500 |
| Deltas (+0.84%) | `body-sm`/`label` | 500 |

---

## 5. Text Quality Rules (non-negotiable)

1. **No orphans / widows.**
   - Headings: `text-wrap: balance;`
   - Paragraphs, descriptions, card text: `text-wrap: pretty;`
   - Fallback for browsers without `pretty`, and for every heading/paragraph under 3 lines: the `noOrphan()` helper joins the last two words with a non-breaking space:
   ```ts
   export const noOrphan = (s: string) => s.replace(/\s+(\S+)\s*$/, " $1");
   ```
   Result: the last line always has at least 2 words. A single word on the last line is a defect.
2. **No broken words.** `hyphens: none; overflow-wrap: normal; word-break: normal;` Never `break-all`. Arabic words are never split. Long IDs/tokens (signature hash) go in a `.mono-id` field with `overflow-wrap: anywhere` inside a scrolling/copyable chip, not in running text.
3. **No letter-spacing on Arabic. Ever.** It breaks the cursive joining. `:lang(ar) { letter-spacing: 0 !important; }` for Arabic runs. Tracking tokens apply to Latin only.
4. **No uppercase transforms on Arabic** (meaningless) and no overline style in Arabic UI. Arabic labels use weight 500 + `--text-secondary` instead.
5. **No justified text.** `text-align: start` everywhere. Justify creates rivers in Latin and ugly kashida stretching in Arabic.
6. **Measure (line length):**
   - Arabic body: max `36rem` (≈ 60 to 70 characters).
   - Latin body: max `34rem` (≈ 62ch in Montserrat).
   - Landing lead paragraph: max `32rem`, max 3 lines at desktop, max 20 words (taste rule).
7. **Line spacing is never tight.** Arabic body ≥ 1.75, Arabic headings ≥ 1.26. Nothing is `leading-none` in Arabic. Never set `overflow: hidden` on a heading box in Arabic (clips dots and kasra); use `padding-block: 0.08em` on display headings.
8. **Paragraph rhythm:** space between paragraphs = 1 line of the paragraph's line-height (`margin-block-end: 1lh` where supported, else the token value).
9. **Truncation (for fixed-size cards, see 04-layout):**
   - Titles: `line-clamp: 1` or `2` with a full-text `title`/tooltip. Truncation happens at a word boundary.
   - Never truncate numbers. A card is designed so its numbers always fit (formatter + compact notation rule above).
10. **Em dash `—` and en dash `–` are banned in all UI copy** (Arabic and English). Use a period, a comma, a colon or parentheses.

---

## 6. Bidirectional Text

- Direction comes from `<html dir>`; components use logical CSS only (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`). `left`/`right` in CSS is a defect (charts excepted, see 06-style).
- Mixed strings (`عيار 21 · 12.500 غ`) wrap each Latin/number chunk in `<bdi>`.
- Inputs for amounts (`budget_iqd`, `purchased_weight_grams`, `total_weight_grams`): `dir="ltr"`, `inputMode="decimal"`, `text-align: end` in RTL so digits align with the label edge; unit shown as a fixed suffix, not typed.
- Email and password fields: `dir="ltr"` always.

---

## 7. Roles → Tokens (for components)

| UI element | Token | Weight | Color |
|---|---|---|---|
| App page title | `h1`/`h2` (responsive) | 700/600 | `--text-primary` |
| Section title in page | `h3` | 600 | `--text-primary` |
| Card title | `h4` 20px | 600 | `--text-primary` |
| Card meta / helper | `body-sm` | 400 | `--text-tertiary` |
| Table header | `body-sm` | 500 | `--text-secondary` |
| Table cell | `body` | 400 (text) / 500 (numbers) | `--text-primary` |
| Button sm (32) | 14px | 500 | per variant |
| Button md (40) / lg (48) / xl (56) | 16px / 16px / 20px | 500 / 500 / 600 | per variant |
| Input value | 16px | 500 | `--text-primary` |
| Input label | 14px | 500 | `--text-secondary` |
| Error message | 14px | 500 | `--market-down` family (`danger-700` / `danger-300`) |
| Badge | 13px Latin / 14px Arabic | 500 | per status |
| Tooltip | 14px | 400 | on tooltip surface |

---

## 8. CSS Implementation

```css
:root {
  --font-sans: "Montserrat", "IBM Plex Sans Arabic", "Plex Arabic Fallback", system-ui, sans-serif;

  --fs-display-2xl: 5.375rem; /* 86 */
  --fs-display-xl: 4.25rem;   /* 68 */
  --fs-display-lg: 3.3125rem; /* 53 */
  --fs-h1: 2.625rem;          /* 42 */
  --fs-h2: 2.0625rem;         /* 33 */
  --fs-h3: 1.625rem;          /* 26 */
  --fs-h4: 1.25rem;           /* 20 */
  --fs-body: 1rem;            /* 16 */
  --fs-sm: 0.875rem;          /* 14 */
  --fs-xs: 0.8125rem;         /* 13, Latin only */
}

/* Arabic line heights (default locale) */
:root:lang(ar) {
  --lh-display-2xl: 6.75rem; --lh-display-xl: 5.5rem; --lh-display-lg: 4.5rem;
  --lh-h1: 3.75rem; --lh-h2: 3rem; --lh-h3: 2.5rem; --lh-h4: 2.25rem;
  --lh-body: 1.75rem; --lh-sm: 1.5rem;
}
/* Latin line heights */
:root:lang(en) {
  --lh-display-2xl: 5.75rem; --lh-display-xl: 4.75rem; --lh-display-lg: 3.75rem;
  --lh-h1: 3rem; --lh-h2: 2.5rem; --lh-h3: 2.25rem; --lh-h4: 2rem;
  --lh-body: 1.625rem; --lh-sm: 1.25rem;
}

html { font-family: var(--font-sans); font-size: 100%; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
body { font-size: var(--fs-body); line-height: var(--lh-body); color: var(--text-primary); }
h1, h2, h3, h4, .display { text-wrap: balance; }
p, li, dd, figcaption { text-wrap: pretty; hyphens: none; }
:lang(ar) { letter-spacing: 0; }
```

React components: `<Text variant="body" />`, `<Heading level={2} />`, `<Num value={...} format="iqd" />`. The agent never sets `font-size` inline.

---

## 9. Microcopy Voice (Arabic first)

- Modern Standard Arabic, short, warm, respectful. No slang in UI, no English jargon when an Arabic word exists (`المحفظة` not `البورتفوليو`).
- Verbs on buttons, 1 to 3 words: `اشترِ الآن`، `ابدأ المطابقة`، `أكّد الشراء`، `أضِف عرضاً`، `روّج العرض`.
- Numbers are specific, never vague: `عمولة 1.0% (12,845 د.ع)` not `عمولة بسيطة`.
- Errors say what happened + what to do: `تغيّرت الكمية المتاحة. حدّث المعاينة للمتابعة.`
- No filler verbs (English): no "elevate", "seamless", "unleash", "revolutionize". Arabic equivalents too: no `ثوري`، `لا مثيل له`.

---

## 10. Checklist

- [ ] No text under 14px Arabic / 13px Latin.
- [ ] No Arabic letter-spacing, uppercase, italic, or justify.
- [ ] Every heading uses `balance`; every paragraph uses `pretty` + `noOrphan` fallback.
- [ ] Every number is Montserrat, tabular, inside `<bdi>`, formatted by `Intl`.
- [ ] Line heights come from tokens only and sit on the 4px grid.
- [ ] Zero `—` / `–` characters in UI strings (`grep -rn "[—–]" src/` returns nothing).
