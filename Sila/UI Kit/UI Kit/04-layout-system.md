# Sila (صِلة) UI Kit · 04 · Layout System

> Principle: **Golden ratio for proportion, 4px grid for precision, fixed sizes for calm.**
> Nothing on screen is sized "by feel". Every width, height, gap and radius comes from a token in this file. Cards do not grow or shrink with their content.

---

## 1. The Three Foundations

1. **φ = 1.618** decides proportions: split columns, the size ladder, type scale (see 02), card heights.
2. **4px base grid** decides precision: every value is a multiple of 4 (except radius tokens and hairlines, which follow Fibonacci numbers).
3. **Fibonacci × 4** decides layout rhythm: `4 · 8 · 12 · 20 · 32 · 52 · 84 · 136`. Consecutive values approach φ, so the rhythm is the golden ratio expressed on the 4px grid.

---

## 2. Spacing Tokens

### 2.1 Component spacing (inside a control or card)
Used for padding inside buttons, inputs, chips, list rows, and gaps between items inside one card.

| Token | Value | Typical use |
|---|---|---|
| `--space-1` | 4px | Icon to badge, tight inline gaps |
| `--space-2` | 8px | Icon to label, chip padding-block, label to input |
| `--space-3` | 12px | Button padding-inline (sm), list row gap |
| `--space-4` | 16px | Button padding-inline (md/lg), input padding-inline |
| `--space-5` | 20px | Card padding (compact), gap between groups inside a card |
| `--space-6` | 24px | Button padding-inline (xl) |

### 2.2 Layout spacing (between blocks, sections, pages) · Fibonacci × 4
| Token | Value | Use |
|---|---|---|
| `--gap-xs` | 12px | Mobile grid gutter |
| `--gap-sm` | 20px | Grid gutter (tablet), gap between cards on mobile, card padding (default) |
| `--gap-md` | 32px | Grid gutter (desktop), card padding (hero panels), page padding-inline (tablet) |
| `--gap-lg` | 52px | Between page sections (app), page padding-inline (desktop) |
| `--gap-xl` | 84px | Landing sections (mobile), big separations |
| `--gap-2xl` | 136px | Landing sections (desktop) |

Rule: **inside** a component use `--space-*`. **Between** components use `--gap-*`. A value that is not a token is a defect.

---

## 3. The Golden Size Ladder

`G(n) = 84 × φⁿ`, rounded to the 4px grid:

| Token | Value | Used for |
|---|---|---|
| `--g-1` | 84px | Collapsed sidebar width, landing icon tiles, avatar-lg |
| `--g-2` | 136px | **KPI card height** |
| `--g-3` | 220px | **Small card height** (quick actions, subscription card), min width of a stat column |
| `--g-4` | 356px | **Listing card height**, compact chart panel height, order summary min width |
| `--g-5` | 576px | **Main chart panel height**, modal-md width, single-column form max width |
| `--g-6` | 932px | Reading max width (legal, FAQ), sheet max width, modal-lg width |
| `--g-7` | 1508px | App content max width on very large screens |

Derived:
- **Sidebar expanded** = `272px` (= 84 × 2φ ≈ 271.8).
- **Landing container** = `1320px` (= `--g-6` 932 + `--g-4` 356 + one 32px gutter).
- **Golden split**: `grid-template-columns: 1.618fr 1fr;` (main + aside). Mirrored automatically in RTL because grid follows `dir`.

---

## 4. Radius Tokens · Fibonacci

The logo's bars have small, tight rounded corners. The UI follows that: soft, never bubbly.

| Token | Value | Applies to (and only to) |
|---|---|---|
| `--radius-2xs` | 3px | Tiny inner elements: checkbox, progress segment, chart tooltip pointer |
| `--radius-xs` | 5px | Badges, chips, tags, kbd |
| `--radius-sm` | 8px | Buttons, inputs, selects, segmented controls, menu items |
| `--radius-md` | 13px | Cards, panels, dropdown/popover, toasts, icon tiles |
| `--radius-lg` | 21px | Modals, sheets, landing hero device frame, large feature panels |
| `--radius-full` | 999px | Toggle switch, avatar, live dot. **Never** on buttons or cards |

**Shape lock**: buttons are always 8, cards always 13, modals always 21. Nested radius rule: inner radius = outer radius − padding (min 3). Example: a 13px card with 8px inner padding holds a 5px element.

---

## 5. Control Sizes (heights)

Designed for a 30 to 60 audience: default controls are **48px**, never smaller than 40 on touch.

| Size | Height | Font | Padding-inline | Icon | Use |
|---|---|---|---|---|---|
| `sm` | 32px | 14px/500 | 12px | 16 | Table row actions, chips, dense filters (desktop only) |
| `md` | 40px | 16px/500 | 16px | 20 | Secondary actions on desktop, card buttons |
| `lg` | 48px | 16px/500 | 16px | 20 | **Default**: inputs, primary buttons, selects, nav items |
| `xl` | 56px | 20px/600 | 24px | 24 | Checkout confirm, hero CTA, mobile primary action |

Rows:
- Table row: 56px (desktop), list row on mobile: 64px.
- Sidebar nav item: 48px. Mobile tab bar: 64px + safe area.
- Topbar (app): 64px. Landing nav: 72px (never above 80).

Minimum hit area 44×44 on every interactive element; 8px minimum gap between adjacent targets.

---

## 6. Grid & Breakpoints

| Name | Min width | Columns | Gutter | Page padding-inline | Nav pattern |
|---|---|---|---|---|---|
| `xs` | 0 | 4 | 12 | 20 | Bottom tab bar |
| `sm` | 640 | 8 | 20 | 20 | Bottom tab bar |
| `md` | 768 | 8 | 20 | 32 | Bottom tab bar |
| `lg` | 1024 | 12 | 32 | 32 | Collapsed sidebar (84) |
| `xl` | 1280 | 12 | 32 | 52 | Expanded sidebar (272) |
| `2xl` | 1536 | 12 | 32 | 52 | Expanded sidebar, content capped at `--g-7` |

Mobile-first. Every multi-column block declares its `< 768` fallback explicitly in the same component.

---

## 7. Hierarchy Rules (visual order)

1. **One focal point per view.** Each screen has exactly one element that wins attention (largest number, or the gold CTA). Examples: Dashboard = live gold price; Checkout = total to pay; Portfolio = total grams owned.
2. **Three levels of emphasis, no more:**
   - L1 (focal): largest size token on the screen, weight 700/600, `--text-primary` (or gold for the gold price).
   - L2 (supporting): `h3`/`h4`, weight 600, `--text-primary`.
   - L3 (detail): `body`/`body-sm`, weight 400, `--text-secondary`/`--text-tertiary`.
3. **Emphasis by weight and color before size.** Size jumps only by scale tokens.
4. **Reading flow in RTL** starts at the top inline-start (right). The focal element sits in the first golden column (inline-start), actions sit at the inline-end or bottom of their block.
5. **Proximity**: related items 8 to 12px apart, groups 20px, blocks 32px, sections 52px. Distance always communicates relationship.
6. **Alignment**: everything aligns to the 12-column grid and to the start edge. Numbers in tables align to the end edge (so decimals line up), labels to the start.
7. **Max one gold element** in the viewport (01-color).

---

## 8. Cards: Fixed, Consistent, Calm

### 8.1 Rules
- Card **height is fixed by a ladder token**. Width comes from the grid. Content never changes the card size.
- A grid of cards uses `grid-auto-rows: var(--g-4);` (or the card's token). All cards in a row are identical in size.
- Every card has a **fixed anatomy** (slots). A slot with no data shows a defined placeholder (`-` in `--text-tertiary`), never collapses.
- Text overflow: titles `line-clamp: 1`, descriptions `line-clamp: 2`, with tooltip for the full text. Numbers never truncate (formatter decides compact notation).
- Padding: 20px (compact cards), 32px (hero panels). Border 1px `--border-default`, radius 13px.
- Card shadow: none at rest (light theme uses border only). On hover (interactive cards only): border `--border-strong` + `shadow-sm` light / `surface-2` dark, and `translateY(-2px)`. No scale.

### 8.2 Card catalog

**KPI card** · height 136
```
┌──────────────────────────────────────┐ padding 20
│ [icon 20] Label (body-sm, tertiary)  │ 24
│                                      │ gap 8
│ 12.500 غ   (h2 33/600, primary)     │ 48
│ +0.84% ▲ منذ أمس (sm, market-up)     │ 20
└──────────────────────────────────────┘
```

**Listing card** · height 356
```
┌──────────────────────────────────────┐ padding 20
│ [عيار 21 chip]            [مروَّج ▲] │ 24   (chip row, fixed)
│ gap 12                                │
│ سبيكة ذهب عيار 21 (h4, clamp 1)      │ 36
│ [SealCheck] البائع: مجوهرات الكرّادة │ 24   (seller row, clamp 1)
│ gap 20                                │
│ ~~ sparkline 24h (height 52) ~~~~~~~ │ 52
│ gap 20                                │
│ سعر الغرام         الكمية المتاحة    │ 20   (labels, body-sm)
│ 98,450 د.ع         84.250 غ          │ 36   (h3 numbers)
│ gap 20                                │
│ [ عرض التفاصيل ]  [ اشترِ ]           │ 40   (buttons md)
└──────────────────────────────────────┘
```
Total: 20+24+12+36+24+20+52+20+20+36+20+40+20 ≈ 344 → spare 12px distributed to the gap above buttons (buttons pinned to the bottom with `margin-block-start: auto`).

**Small card** · height 220 (subscription status, quick action, AI match teaser).

**Chart panel** · height 356 (compact) / 576 (main). Header 52px (title + range tabs), plot fills the rest, footer optional 40px.

**Order summary panel** (checkout) · sticky, width `1fr` of golden split, min 356. Height by content (it is a panel, not a grid card), but its rows are fixed 44px each.

### 8.3 Empty, loading, error inside cards
- Loading: skeleton with the **exact same slots** (same heights), no spinners.
- Empty: same card size, centered 32px icon tile + one line + one action.
- Error: same card size, `ShieldWarning`/`Warning` + message + retry (ghost button).

---

## 9. App Shell

```
RTL (Arabic)                                   
┌───────────────────────────────────────────────┬──────────┐
│ Topbar 64: search · live price chip · bell · avatar │ Sidebar │
├───────────────────────────────────────────────┤ 272 / 84 │
│                                               │ logo     │
│   Page content (max --g-7, padding 52)        │ nav 48px │
│                                               │ items    │
│                                               │ ...      │
│                                               │ account  │
└───────────────────────────────────────────────┴──────────┘
```
- Sidebar sits on the inline-start side (right in Arabic, left in English). Light theme: navy sidebar (`--surface-brand`) with white text. Dark theme: `dark-surface-1`.
- Topbar holds a persistent **live price chip** (24K per gram + direction caret), visible on every page: the market is always in view.
- Mobile: sidebar becomes a bottom tab bar (max 5 items) + a top app bar 56px.

---

## 10. Page Templates

### T1 · Investor Dashboard (desktop)
```
Row 1 (height 356):  [ Live Gold Price panel 1.618fr ] [ Smart Match quick panel 1fr ]
Row 2 (height 136):  [ KPI ][ KPI ][ KPI ][ KPI ]   (4 equal columns)
Row 3 (height 356):  [ Featured listings: 2 cards 1.618fr ] [ Recent transactions 1fr ]
```
Mobile: rows stack; KPI row becomes a 2×2 grid; listings become a horizontal snap list of fixed 300×356 cards.

### T2 · Market (listings)
- Sticky filter bar 64px (karat segmented control, price range, sort) under the topbar.
- Grid: `grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); grid-auto-rows: var(--g-4); gap: 32px;`
- Mobile: single column, cards full width, height stays 356.

### T3 · Detail + Checkout (golden split)
```
[ Details, chart (576), seller, AI insight   1.618fr ] [ Order summary (sticky)  1fr ]
```
Mobile: summary becomes a sticky bottom bar (total + primary action), full summary opens in a bottom sheet.

### T4 · Auth / KYC / Create listing (focused forms)
- Desktop: golden split. Brand panel `1fr` (navy, logo, one sentence, trust points) + form `1.618fr` with the form capped at `--g-5` 576px.
- Form fields full width of the form column, stacked, gap 20px; groups gap 32px.
- Mobile: brand panel collapses to a 136px header band with the icon logo.

### T5 · Portfolio
```
Row 1: [ Verified holdings hero (total grams + value) 1.618fr ] [ Signature verification card 1fr ]   height 356
Row 2: [ Allocation by karat 1fr ] [ Value over time chart 1.618fr ]                                height 356
Row 3: [ Transactions table full width ]
```
Rows alternate the golden split direction so the page does not feel repetitive.

### Modals & sheets
| Type | Width | Radius | Use |
|---|---|---|---|
| Dialog sm | 440px | 21 | Confirmations (suspend listing) |
| Dialog md | 576px | 21 | KYC mock, promote listing, subscribe |
| Sheet (mobile) | full width, max height 92dvh | 21 top corners | All modals on `< 768` |

---

## 11. Elevation & Layers

### Shadows (light theme only, navy-tinted, never black)
```css
--shadow-sm: 0 1px 2px rgba(2, 48, 71, 0.06);
--shadow-md: 0 4px 12px -2px rgba(2, 48, 71, 0.08), 0 2px 4px rgba(2, 48, 71, 0.04);
--shadow-lg: 0 12px 32px -8px rgba(2, 48, 71, 0.16), 0 4px 8px rgba(2, 48, 71, 0.06);
```
Dark theme: depth = lighter surface (01-color 3.6) + 1px border. Only popovers/modals get `0 16px 48px -12px rgba(0, 20, 32, 0.6)`.

### Z-index scale (the only values allowed)
| Token | Value | Layer |
|---|---|---|
| `--z-base` | 0 | Content |
| `--z-sticky` | 100 | Sticky filter bar, table header |
| `--z-header` | 200 | Topbar, sidebar, bottom tab bar |
| `--z-dropdown` | 300 | Menus, popovers, select lists |
| `--z-overlay` | 400 | Scrim |
| `--z-modal` | 500 | Dialogs, sheets |
| `--z-toast` | 600 | Toasts |
| `--z-tooltip` | 700 | Tooltips |

---

## 12. CSS Implementation (excerpt)

```css
:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --gap-xs: 12px; --gap-sm: 20px; --gap-md: 32px; --gap-lg: 52px; --gap-xl: 84px; --gap-2xl: 136px;
  --g-1: 84px; --g-2: 136px; --g-3: 220px; --g-4: 356px; --g-5: 576px; --g-6: 932px; --g-7: 1508px;
  --sidebar: 272px; --sidebar-collapsed: 84px; --topbar: 64px; --nav-landing: 72px;
  --container-landing: 1320px;
  --radius-2xs: 3px; --radius-xs: 5px; --radius-sm: 8px; --radius-md: 13px; --radius-lg: 21px; --radius-full: 999px;
  --h-sm: 32px; --h-md: 40px; --h-lg: 48px; --h-xl: 56px;
}

.golden { display: grid; grid-template-columns: 1.618fr 1fr; gap: var(--gap-md); }
.golden--rev { grid-template-columns: 1fr 1.618fr; }
@media (max-width: 767px) { .golden, .golden--rev { grid-template-columns: 1fr; gap: var(--gap-sm); } }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); grid-auto-rows: var(--g-4); gap: var(--gap-md); }
@media (max-width: 767px) { .card-grid { grid-template-columns: 1fr; gap: var(--gap-sm); } }
```

---

## 13. Layout Checklist

- [ ] Every spacing value is a `--space-*` or `--gap-*` token.
- [ ] Every card has a fixed height token; a grid of cards is perfectly even.
- [ ] Each view has one focal point and max 3 emphasis levels.
- [ ] Golden split used for main/aside; alternates direction between rows.
- [ ] No `left`/`right` in CSS for layout (logical properties only).
- [ ] Radius: buttons 8, inputs 8, cards 13, modals 21. No exceptions.
- [ ] No layout shift: images, charts and skeletons reserve their final size.
- [ ] Mobile fallback declared for every multi-column block; no horizontal page scroll (the landing's single horizontal section is pinned and scroll-driven, not overflowing).
