# Sila (صِلة) UI Kit · 06 · Visual Style (Fin-Tech)

> Style name: **"Quiet Terminal"**. Institutional navy surfaces, hairline structure, tabular numbers, and one gold signal. It must feel like a serious trading desk that a 55 year old investor trusts on first look, with the polish of the best modern fintech products (Stripe-level craft).

---

## 1. Design Read & Dials

**Design read:** Fintech gold marketplace for Iraqi investors aged 30 to 60 and gold sellers, trust-first, calm and data-rich, dark institutional navy with a single gold signal, built on real live data.

| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | Why |
|---|---|---|---|---|
| App (dashboard, checkout, KYC) | 4 | 4 | 6 | Trust and speed first. Motion only for feedback and live data |
| Landing page | 7 | 7 | 4 | Storytelling, scroll-driven, premium, still calm |

---

## 2. What "Modern Fin-Tech" Means Here (2026 patterns applied)

| Pattern | How Sila applies it |
|---|---|
| **Tabular, tuned numerals** | All figures in Montserrat tabular, unit smaller than figure, sign + caret on deltas (02-typography) |
| **Readable in a hurry, trusted on first pass** | One focal number per view, max 3 emphasis levels, neutral defaults, color only to inform (never to alarm) |
| **Fees visible before the action** | Commission rate + amount + total shown in the preview, before "confirm". The tier table is public on the landing page |
| **Explainable AI** | Every AI suggestion carries a one-line reason ("يغطي ميزانيتك بالكامل مع هامش أمان 10%") and an obvious manual alternative ("تصفح السوق بنفسك") |
| **Trust cues as first-class components** | Verified seal, signature verification card, "last updated" stamps, atomic execution note. Not footnotes |
| **Graceful degradation** | If live price fails: last cached price + timestamp + "آخر تحديث" chip, never a blank panel |
| **Skeletons over spinners** | Skeletons with the exact final layout; AI calls show a progress line with honest copy |
| **Receipts, not confetti** | Purchase success = a clean receipt with the new balance. No celebration animations on money actions |
| **Calm dark mode** | Navy (not black) surfaces, elevation by lightness, no neon, no glow |
| **Live data micro-motion** | Tick flash, digit roll, drawing sparklines. Motion exists because the data moves |
| **Hairlines over shadows** | 1px borders define structure; shadows only for floating layers |

---

## 3. Brand Motifs (taken from the logo, used with restraint)

The logo is four slanted bars and four small squares turning around a center: **connection** (صِلة). Three motifs come from it. They make Sila recognizable without decoration.

### 3.1 The Sila Cut (20° slant)
The long bars of the logo end with a ~20° slanted cut. The UI reuses this angle on a few small elements only:
```css
--slant: 20deg;
/* inline-end top corner cut, size = 8px */
.sila-cut { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 0 100%); }
[dir="rtl"] .sila-cut { clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%); }
```
Allowed on (and only on):
- The **last-price tag** on the chart's price axis.
- The **live price chip** in the topbar.
- **Step segments** of progress indicators (checkout, KYC, landing walkthrough).
- The ends of the **active tab indicator** bar.
- Landing trust-panel icon tiles (inline-end top corner).
Never on buttons, inputs, cards or modals (those follow the radius lock).

### 3.2 Squares as data points
The logo's small rounded squares become the **marker shape** everywhere a dot would normally appear:
- Chart markers, sparkline end point, legend swatches: **rounded squares** (size 8, radius 2), not circles.
- Live indicator: an 8px rounded square with a soft opacity pulse (not a circle, not a glowing dot).
- Step indicators in steppers: squares.
This is a small, consistent signature across every chart.

### 3.3 Four-around-one composition
Used once on the landing page (trust/security section) and in the logo loader: four elements around a central value. Not used in the app layouts.

---

## 4. Surfaces & Materials

- **Flat solids only.** No gradients (01-color section 8), no glassmorphism in the app, no noise textures, no glows, no neumorphism, no 3D renders.
- **One exception for translucency:** the landing nav, once scrolled: `background: rgba(2,48,71,0.88); backdrop-filter: blur(12px);` with a 1px `#214a61` bottom border. Solid fallback `#023047` under `prefers-reduced-transparency` or unsupported browsers.
- Borders: 1px. Selected: 1.5px inset shadow. Focus: 3px ring.
- Background hierarchy (dark): `#002337` (sunken) < `#023047` (canvas) < `#093b54` (card) < `#144660` (popover) < `#1d526c` (tooltip).
- Background hierarchy (light): white canvas, `#f7fbfc` subtle zones, cards white with border, navy sidebar.

---

## 5. Core Components: Visual Spec

### 5.1 Buttons
- Heights 32/40/48/56, radius 8, label weight 500 (600 at xl), icon 20 (24 at xl), gap 8.
- Variants and colors: 01-color 5.5. Max **one Accent (gold)** button per view.
- Press: `scale(0.98)` + darker token, 80ms. Hover: color change 130ms. No lifting, no shadows on buttons.
- Loading: label stays, a 16px inline progress (3 of the logo's squares pulsing in sequence) replaces the icon; width never changes; button `aria-busy="true"` and disabled against double submit.
- Labels: 1 to 3 words, one line always.

### 5.2 Inputs
- Height 48, radius 8, bg: light `#ffffff`, dark `#002337`; border `--border-input`; text 16/500.
- Label above (14/500, `--text-secondary`), helper below (14/400, `--text-tertiary`), error below with `WarningOctagon` 16.
- Money/weight inputs: LTR digits, fixed unit suffix (`د.ع`, `غ`) in `--text-tertiary`, live formatted thousands separators, `inputMode="decimal"`.
- Budget input (Smart Match) is an **XL field**: height 64, value in `h3` 26/600, suggestions chips under it (`500,000` · `1,000,000` · `5,000,000`).

### 5.3 Segmented control (karat, chart range)
- Track: `--bg-muted`, radius 8, height 40. Selected segment: `--surface-1` (light) / `#1d526c` (dark) with 1px border, label 600. Indicator slides with Motion `layoutId`.

### 5.4 Chips & badges
- Height 24 (badge) / 32 (chip), radius 5, label 13 Latin / 14 Arabic, weight 500.
- Karat chip: `Diamond` icon + `عيار 21`. Status badges: tinted container + text (01-color 6.1). Promoted: `Megaphone` + `مروَّج` with `--border-gold`, text `--text-gold`, no gold fill.

### 5.5 Tables (transactions, sales log)
- Row 56, header 44 sticky, header text 14/500 `--text-secondary`, `--bg-muted` header.
- Only bottom border between rows (`--border-subtle`), never boxed cells.
- Numbers end-aligned, tabular; dates start-aligned in `body-sm`.
- Hover row `--state-hover`. Row click opens a side sheet with the full receipt.
- Mobile: rows become 2-line list items (primary line: amount; secondary: date · karat).

### 5.6 Tooltip, popover, toast
- Tooltip: `surface-3`, radius 5, 14px, max width 280, delay 400ms, arrow 6px square rotated.
- Popover: `surface-2`, radius 13, padding 12, `--shadow-lg` light.
- Toast: `surface-3`, radius 13, icon + title + one line, bottom inline-end, auto-dismiss 5s (errors do not auto-dismiss).

### 5.7 Modal & sheet
- Radius 21, padding 32 (desktop) / 20 (mobile). Scrim navy (01-color). Title `h3`. Actions at the bottom, primary at inline-end.

### 5.8 Stepper (checkout, KYC)
- Horizontal segments with the Sila Cut, 4px tall, gap 4. Done: `--state-selected-indicator`; current: `#219ebc`; upcoming: `--border-default`. Step labels are the step names (verbs), never "Step 1".

---

## 6. Fin-Tech Signature Components

### 6.1 Live Price Panel (dashboard focal point)
```
┌ Live Gold Price ─────────────────────── [1D 1W 1M 3M 1Y] ┐
│ ■ مباشر   آخر تحديث قبل 12 ثانية                          │
│ 98,450 د.ع / غ  (display-lg, gold in dark)   ▲ +0.84%     │
│ عيار 24 · 1 دولار = 1,310 د.ع                              │
│ ───────────── area chart (flat fill) ───────────── [tag]   │
│ 24K 112,514   22K 103,138   21K 98,450   18K 84,386        │
└────────────────────────────────────────────────────────────┘
```
- The price figure uses digit roll on update; a subtle tick flash (01-color 6.2) on the delta chip only, 550ms (`--dur-5`).
- Karat row derived with `GlobalPrice24k × Karat/24`, all tabular.

### 6.2 Live price chip (topbar, every page)
`[■ 24K  112,514 د.ع ▲0.84%]`, height 32, Sila Cut on inline-end, gold figure in dark theme. Click opens the market page.

### 6.3 AI Insight line
- Block with `Sparkle` 16 (secondary color), text `body` in `--text-secondary`, background `--bg-muted`, radius 8, padding 12 16.
- Always states source and confidence in plain words: `تحليل ذكي بناءً على سعر اليوم مقارنة بالأمس`.
- Failure state: `التحليل الذكي غير متاح حالياً` in the same block (never hides the checkout).

### 6.4 Order summary (checkout)
Rows 44px, label start, number end:
```
الكمية                          12.500 غ
سعر التنفيذ للغرام (عيار 21)    98,450 د.ع
القيمة الصافية                  1,230,625 د.ع
العمولة (1.5%)                  18,459 د.ع
────────────────────────────────────────
المبلغ الكلي                    1,249,084 د.ع   (h2, primary)
[LockSimple] السعر محسوب لحظة المعاينة · قبل 8 ثوانٍ   [تحديث]
[ أكّد الشراء  1,249,084 د.ع ]   (xl, accent)
```

### 6.5 Signature verification card (portfolio)
- `Signature` icon tile + "رصيد موثّق رقمياً" + short hash chip `a3f9…c21e` with copy + status `SealCheck` (fill) "تم التحقق".
- Failure (`INTEGRITY_CHECK_FAILED`): the balance is **not shown**; card turns into a danger-tinted notice with `ShieldWarning` and a support action.

### 6.6 KPI card
136px, label + value + delta. No mini charts inside KPI cards (sparklines live in listing cards and panels only), so KPIs stay readable.

---

## 7. Charts

### 7.1 Libraries
| Chart | Library | Why |
|---|---|---|
| Gold price history (area / line / candles), USD/IQD | **TradingView Lightweight Charts** (v5) | Canvas, 60fps with live updates, crosshair, price scale, tiny bundle |
| Sparklines, allocation bar, donut, commission tiers, landing illustrations | **Custom SVG** with `d3-scale` + `d3-shape` | Full style control, animatable paths (Anime.js drawable) |

No other chart library. No chart.js, no default Recharts look.

### 7.2 Styling rules
- **No gradient fills.** Area under a line = one flat alpha fill (`rgba(255,183,3,0.10)` dark / `rgba(253,158,2,0.10)` light).
- Line width 2px (main), 1.5px (sparklines). Curves: monotone (`curveMonotoneX`), no overshooting splines.
- Grid: horizontal lines only, 1px `--border-subtle` equivalent, max 5 lines. No vertical grid, no chart border box.
- Axes: labels 13px Montserrat tabular, `--text-tertiary`. **Time runs left to right in both locales**, price scale on the right side (global financial convention); the chart container gets `dir="ltr"`, surrounding UI stays RTL.
- Crosshair: dashed 1px, tooltip on `surface-3` with date + value + change.
- Last price: tag on the price axis with the Sila Cut, gold in dark theme (`#ffb703` bg, navy text).
- Markers: rounded squares 8×8 (motif 3.2).
- Candles (optional "pro" view): up `--market-up` line color, down `--market-down`, hollow up candles not used.
- Range tabs: segmented control `1D 1W 1M 3M 1Y`, default `1D`.
- Empty/loading: skeleton of axes + flat line placeholder. Error: last cached series + notice.

### 7.3 Chart accessibility
- `role="img"` + `aria-label` summary: `سعر غرام الذهب عيار 24 ارتفع 0.84% اليوم إلى 112,514 دينار`.
- Hidden data table alternative (`<table class="sr-only">`) for the visible range.
- Direction never by color alone: sign + caret.

---

## 8. Imagery & Illustration

- The primary visual of Sila is **its own live data and real UI components**. The landing's product showcases are built from the actual app components rendered with demo data (same code as the app), not fake div mockups or screenshots of nothing.
- **Gold visual element** (landing only): an isometric gold bar built from flat facets using the logo's slanted-bar silhouette. Three flat faces: top `#ffcd54`, front `#ffb703`, side `#df8019`. No gradients, no shine sweep, no 3D render. Used to visualize grams (for example stacking bars by weight in the calculator).
- Photography: none by default. If ever used, real licensed photography only, color-graded cool (navy shadows), never behind text.
- Banned: stock "businessman with tablet", gold coin 3D clichés, glowing globe networks, abstract blob shapes, AI-purple anything.

---

## 9. Anti-Slop Rules Specific to Sila

1. No gradient (except the one navy wash on the landing, 01-color 8).
2. No three identical feature cards in a row.
3. No centered-everything layouts; use the golden split.
4. No decorative dots, no section-number eyebrows (`01 /`), no "Step 1/2/3" labels.
5. No fake-perfect numbers in demo data. Use organic data: `112,514`, `+0.84%`, `84.250 غ`, not `100,000` / `50%`.
6. No generic names: demo sellers are realistic Iraqi businesses (`مجوهرات الكرّادة`، `صاغة شارع النهر`، `ذهب المنصور`), demo investors realistic names (`أحمد الجبوري`، `زينب الموسوي`).
7. No emoji, no confetti, no neon, no glass cards, no pure black.
8. No filler copy ("ثوري"، "حلول مبتكرة"، "seamless", "next-gen").
9. Em dash banned in all copy.
10. One eyebrow per three sections max on the landing; none in the app.

---

## 10. Visual QA Checklist

- [ ] Only flat fills (grep "gradient" shows only the landing wash).
- [ ] One gold element per view; gold only for CTA / gold price / premium / promoted.
- [ ] All markers are squares; all live indicators are squares.
- [ ] Sila Cut used only on the 5 allowed elements.
- [ ] Charts: flat area fill, horizontal grid only, LTR time axis, accessible summary.
- [ ] Every money screen shows the fee before the action.
- [ ] Every AI output has a reason line and a manual alternative.
- [ ] Every live value shows "last updated" when stale (> 90s).
