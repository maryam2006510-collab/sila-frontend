# Sila (صِلة) UI Kit · 01 · Color System

> Source of truth for every color in the product. Components never use raw hex values. They use **semantic tokens** (section 5), which point to **ramp tokens** (section 3), which are built around the **brand anchors** (section 1).
> Every text/background pair listed in this file was contrast-checked (WCAG 2.2). Ratios are in section 9.

---

## 1. Brand Anchors (unchanged, exactly as given)

| Role | Share | Anchor | Hex | Where it lives in the ramps |
|---|---|---|---|---|
| Primary | 60% | Abyss Navy | `#023047` | `primary-900` |
| Primary | 60% | Deep Petrol | `#126782` | `primary-600` |
| Secondary | 30% | Signal Blue | `#219ebc` | `secondary-500` |
| Secondary | 30% | Mist Blue | `#8ecae6` | `secondary-300` |
| Accent | 10% | Bullion Gold | `#ffb703` | `accent-400` |
| Accent | 10% | Amber Gold | `#fd9e02` | `accent-500` |
| Background dark | - | Abyss Navy | `#023047` | `bg-canvas` (dark) |
| Background light | - | White | `#ffffff` | `bg-canvas` (light) |

The logo files use the same values: `Logo 1 = #023047`, `Logo 2 = #126782`, `Logo 3 = #219ebc`, `Logo 4 = #8ecae6`. The logo and the UI share one palette.

### Why the accent is gold
Sila is a gold marketplace. The accent is not decoration: **gold = the asset + the one primary action on screen**. That meaning is protected (section 7).

---

## 2. The 60 / 30 / 10 Rule, Applied Concretely

The percentages are measured as **visual area on a screen**, not as a count of components.

| Share | What it covers (dark theme) | What it covers (light theme) |
|---|---|---|
| **60% Primary** | Canvas `#023047`, surfaces (navy tints), sidebar, nav, cards, table rows | Navy text, navy primary buttons, sidebar (navy), headers of data panels. Canvas is white, so here the 60% is "white + navy" together as the base |
| **30% Secondary** | Links, secondary buttons, chart lines of non-gold series, focus rings, selected rows, info states, tabs indicator, data highlights | Same roles, using darker steps (`secondary-700/800`) for text |
| **10% Accent** | ONE primary CTA per view, the live gold price line, gold price figure, premium markers, "promoted" markers | Same. Never more than one gold-filled element in the same viewport region |

**Hard limits**
- Max **1 gold-filled button per view** (per screen, or per modal).
- Gold is never used for body text, borders of generic cards, or icons in the navigation.
- Secondary blue is never a large background fill (> 30% of the viewport). It is a signal color.

---

## 3. Ramp Tokens (full shades)

Built in OKLCH around the anchors so that every step has even perceived lightness. Anchor steps are **bold**.

### 3.1 Primary (Navy → Petrol)
| Token | Hex | On white | On `#023047` |
|---|---|---|---|
| `primary-50` | `#eef8fc` | 1.08 | 12.84 |
| `primary-100` | `#d8eef6` | 1.20 | 11.53 |
| `primary-200` | `#b5dbea` | 1.47 | 9.42 |
| `primary-300` | `#8ac1d6` | 1.97 | 7.04 |
| `primary-400` | `#5ba0ba` | 2.92 | 4.74 |
| `primary-500` | `#3384a0` | 4.24 | 3.26 |
| **`primary-600`** | **`#126782`** | 6.39 | 2.17 |
| `primary-700` | `#0a536d` | 8.50 | 1.63 |
| `primary-800` | `#044059` | 11.15 | 1.24 |
| **`primary-900`** | **`#023047`** | 13.85 | 1.00 |
| `primary-950` | `#001e30` | 17.10 | 1.23 |

### 3.2 Secondary (Signal → Mist)
| Token | Hex | On white | On `#023047` |
|---|---|---|---|
| `secondary-50` | `#edf9fd` | 1.07 | 12.91 |
| `secondary-100` | `#d8f2fb` | 1.17 | 11.88 |
| `secondary-200` | `#b6e1f4` | 1.39 | 9.94 |
| **`secondary-300`** | **`#8ecae6`** | 1.79 | 7.74 |
| `secondary-400` | `#55b4d3` | 2.37 | 5.84 |
| **`secondary-500`** | **`#219ebc`** | 3.14 | 4.41 |
| `secondary-600` | `#0b839e` | 4.42 | 3.14 |
| `secondary-700` | `#006980` | 6.30 | 2.20 |
| `secondary-800` | `#005064` | 9.01 | 1.54 |
| `secondary-900` | `#023b4e` | 12.08 | 1.15 |
| `secondary-950` | `#022837` | 15.43 | 1.11 |

### 3.3 Accent (Gold)
| Token | Hex | On white | On `#023047` |
|---|---|---|---|
| `accent-50` | `#fffae8` | 1.05 | 13.25 |
| `accent-100` | `#fff2c6` | 1.12 | 12.38 |
| `accent-200` | `#ffe390` | 1.26 | 10.98 |
| `accent-300` | `#ffcd54` | 1.49 | 9.31 |
| **`accent-400`** | **`#ffb703`** | 1.75 | 7.93 |
| **`accent-500`** | **`#fd9e02`** | 2.09 | 6.64 |
| `accent-600` | `#df8019` | 2.90 | 4.77 |
| `accent-700` | `#b76219` | 4.40 | 3.15 |
| `accent-800` | `#8d4917` | 6.78 | 2.04 |
| `accent-900` | `#683613` | 9.88 | 1.40 |
| `accent-950` | `#42220c` | 14.33 | 1.03 |

### 3.4 Neutral (navy-tinted slate, hue 230)
Pure grays are banned. Every neutral carries a trace of the navy hue so the whole product reads as one temperature.

| Token | Hex | On white |
|---|---|---|
| `neutral-0` | `#ffffff` | 1.00 |
| `neutral-25` | `#f7fbfc` | 1.04 |
| `neutral-50` | `#f1f6f8` | 1.09 |
| `neutral-100` | `#e5ecf0` | 1.19 |
| `neutral-200` | `#d4dee3` | 1.37 |
| `neutral-300` | `#bdcad0` | 1.68 |
| `neutral-400` | `#83949d` | 3.14 |
| `neutral-500` | `#647680` | 4.72 |
| `neutral-600` | `#52636d` | 6.24 |
| `neutral-700` | `#394a55` | 9.19 |
| `neutral-800` | `#21333e` | 13.06 |
| `neutral-900` | `#11212c` | 16.44 |
| `neutral-950` | `#05131c` | 18.81 |

`#000000` is never used anywhere (shadows included).

### 3.5 Semantic Ramps
Tuned to sit inside the palette: green leans teal (hue 158), red leans slightly cool (hue 25) so neither clashes with navy.

| Step | Success (Gain) | Danger (Loss) |
|---|---|---|
| 50 | `#e8fdf3` | `#fff3f3` |
| 100 | `#cdf6e3` | `#ffe3e1` |
| 200 | `#a0ebc7` | `#ffc6c4` |
| 300 | `#64d8a4` | `#ff9f9e` |
| 400 | `#2fc183` | `#f77170` |
| 500 | `#0ca366` | `#e84545` |
| 600 | `#0e8754` | `#c92f30` |
| 700 | `#0e6c43` | `#a52522` |
| 800 | `#075235` | `#811e1b` |
| 900 | `#043a26` | `#5c1714` |

**Warning** reuses the gold ramp (`accent-*`). **Info** reuses the secondary ramp. This keeps the palette closed (no extra hues). To stop warning and CTA from being confused, warnings are **always** a tinted container + icon + text, never a solid gold fill (section 6).

### 3.6 Dark Surface Ramp (elevation by lightness)
In dark mode, depth is shown by **lighter navy surfaces**, not by shadows.

| Token | Hex | Use |
|---|---|---|
| `dark-sunken` | `#002337` | Inputs, wells, chart plot background, code/ID fields |
| `dark-canvas` | `#023047` | Page background (brand anchor) |
| `dark-hover` | `#07374f` | Row hover on canvas |
| `dark-surface-1` | `#093b54` | Cards, panels, sidebar |
| `dark-pressed` | `#0f4159` | Pressed row / pressed card |
| `dark-surface-2` | `#144660` | Popovers, dropdowns, hovered cards, sticky headers |
| `dark-surface-3` | `#1d526c` | Tooltips, selected chips, highest layer |
| `dark-border-subtle` | `#214a61` | Dividers inside cards |
| `dark-border-default` | `#315b72` | Card borders, table borders |
| `dark-border-strong` | `#518097` | Input borders, focused outlines baseline (3.77:1 on sunken) |

---

## 4. Theme Model

- Themes: `light` and `dark`, set once on `<html data-theme="...">`. Default = user system preference, remembered after manual switch.
- **Page Theme Lock**: a page never mixes themes section by section. Exception: the landing page is **dark only** by design (it is a marketing surface; brand anchor `#023047` is the canvas). The app (dashboard) supports both.
- Components read only semantic tokens, so they switch theme without code changes.

---

## 5. Semantic Tokens (what components use)

### 5.1 Backgrounds & Surfaces
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-canvas` | `neutral-0` `#ffffff` | `#023047` | Page |
| `--bg-subtle` | `neutral-25` `#f7fbfc` | `dark-sunken` `#002337` | Secondary page areas, app shell behind cards |
| `--bg-muted` | `neutral-50` `#f1f6f8` | `dark-surface-1` `#093b54` | Table header, segmented control track |
| `--bg-sunken` | `neutral-50` `#f1f6f8` | `dark-sunken` `#002337` | Inputs (dark), wells, chart plot areas |
| `--surface-1` | `#ffffff` + border | `#093b54` | Cards |
| `--surface-2` | `#ffffff` + shadow-md | `#144660` | Popovers, menus, dropdowns |
| `--surface-3` | `#ffffff` + shadow-lg | `#1d526c` | Tooltips, toasts |
| `--surface-inverse` | `#023047` | `#ffffff` | Inverse tooltips, emphasis blocks |
| `--surface-brand` | `#023047` | `#126782` | Sidebar (light), brand panels, KYC header band |
| `--scrim` | `rgba(2, 48, 71, 0.56)` | `rgba(0, 20, 32, 0.72)` | Modal/sheet backdrop (navy based, never black) |

### 5.2 Text
| Token | Light | Dark | Min contrast |
|---|---|---|---|
| `--text-primary` | `#023047` | `#ffffff` | 13.85 / 8.48 worst case |
| `--text-secondary` | `neutral-700` `#394a55` | `primary-100` `#d8eef6` | 9.19 / 7.06 |
| `--text-tertiary` | `neutral-600` `#52636d` | `#a2cbdd` | 6.24 / 4.90 |
| `--text-placeholder` | `neutral-500` `#647680` | `#a2cbdd` | 4.72 / 4.90 |
| `--text-disabled` | `neutral-400` `#83949d` | `primary-400` `#5ba0ba` | exempt, never used for info |
| `--text-inverse` | `#ffffff` | `#023047` | |
| `--text-link` | `secondary-700` `#006980` | `secondary-300` `#8ecae6` | 6.30 / 5.66 |
| `--text-link-hover` | `secondary-800` `#005064` | `secondary-200` `#b6e1f4` | |
| `--text-on-accent` | `#023047` | `#023047` | 7.93 on gold |
| `--text-on-brand` | `#ffffff` | `#ffffff` | |
| `--text-gold` | `accent-800` `#8d4917` | `accent-400` `#ffb703` | 6.78 / 6.81 (gold figures, "premium") |

Rule for the 30 to 60 audience: **no text below `--text-tertiary`** for anything the user needs to read. Disabled text is only for disabled controls.

### 5.3 Borders
| Token | Light | Dark | Use |
|---|---|---|---|
| `--border-subtle` | `neutral-100` `#e5ecf0` | `#214a61` | Dividers inside a card |
| `--border-default` | `neutral-200` `#d4dee3` | `#315b72` | Card, table, panel outline |
| `--border-strong` | `neutral-300` `#bdcad0` | `#518097` | Hovered card, segmented control |
| `--border-input` | `neutral-400` `#83949d` | `#518097` | Input/checkbox/radio boundary (≥ 3:1, WCAG 1.4.11) |
| `--border-input-hover` | `neutral-600` `#52636d` | `primary-300` `#8ac1d6` | |
| `--border-focus` | `secondary-500` `#219ebc` | `secondary-400` `#55b4d3` | Focus ring color |
| `--border-selected` | `primary-900` `#023047` | `secondary-300` `#8ecae6` | Selected card / option |
| `--border-danger` | `danger-600` | `danger-400` | Invalid field |
| `--border-gold` | `accent-500` | `accent-400` | Promoted listing, premium card only |

### 5.4 Border States (every bordered element)
| State | Border | Width | Extra |
|---|---|---|---|
| Default | `--border-default` (cards) / `--border-input` (fields) | 1px | |
| Hover | `--border-strong` / `--border-input-hover` | 1px | 160ms color transition |
| Focus-visible | `--border-focus` | 1px + 3px ring | Ring: `0 0 0 3px color-mix(in oklch, var(--border-focus) 35%, transparent)`, plus 2px offset on buttons |
| Active / Pressed | `--border-strong` | 1px | |
| Selected | `--border-selected` | **1.5px** | Width change is done with `box-shadow: inset 0 0 0 1.5px`, never by changing `border-width` (no layout shift) |
| Error | `--border-danger` | 1px + error ring | Plus icon + message under field |
| Disabled | `--border-subtle` | 1px, dashed not allowed | Opacity of content 0.5, cursor not-allowed |
| Read-only | `--border-subtle` | 1px | Background `--bg-muted` |

### 5.5 Interactive Color States (Buttons)
All transitions: `background-color, border-color, color` over `--dur-2` (130ms) with `--ease-standard` (see 07-motion).

| Variant | Theme | Default bg / text | Hover | Pressed | Disabled |
|---|---|---|---|---|---|
| **Accent (CTA)** | both | `#ffb703` / `#023047` | `#fd9e02` | `#df8019` | `neutral-200` / `neutral-500` (light), `#144660` / `primary-400` (dark) |
| **Primary** | light | `#023047` / `#fff` | `#044059` | `#001e30` | same as above |
| **Primary** | dark | `#8ecae6` / `#023047` | `#b6e1f4` | `#55b4d3` | same as above |
| **Brand** | both | `#126782` / `#fff` | `#0a536d` | `#044059` | |
| **Secondary (outline)** | light | transparent, border `--border-strong`, text `#023047` | bg `neutral-50`, border `neutral-400` | bg `neutral-100` | |
| **Secondary (outline)** | dark | transparent, border `#315b72`, text `#fff` | bg `#144660`, border `#518097` | bg `#1d526c` | |
| **Ghost** | light | transparent / `#023047` | bg `neutral-50` | bg `neutral-100` | |
| **Ghost** | dark | transparent / `#fff` | bg `#07374f` | bg `#0f4159` | |
| **Danger** | light | `#c92f30` / `#fff` | `#a52522` | `#811e1b` | |
| **Danger** | dark | `#f77170` / `#023047` | `#ff9f9e` | `#e84545` | |

Note: the two gold anchors are used exactly as a pair: `#ffb703` is rest, `#fd9e02` is hover. The two navy anchors are a pair too: `#023047` is primary, `#126782` is its brand variant.

### 5.6 Other Interactive Tokens
| Token | Light | Dark |
|---|---|---|
| `--state-hover` (rows, list items) | `neutral-25` `#f7fbfc` | `#07374f` |
| `--state-pressed` | `neutral-50` `#f1f6f8` | `#0f4159` |
| `--state-selected-bg` | `secondary-50` `#edf9fd` | `#144660` |
| `--state-selected-indicator` | `#023047` | `#8ecae6` |
| `--selection` (`::selection`) | `secondary-200` bg, `#023047` text | `#126782` bg, `#fff` text |
| `--skeleton-base` | `neutral-100` | `#093b54` |
| `--skeleton-highlight` | `neutral-50` | `#144660` |

---

## 6. Status & Market Colors

### 6.1 Feedback states
| Status | Container bg (light / dark) | Border | Icon + title text (light / dark) | Phosphor icon |
|---|---|---|---|---|
| Success | `success-50` / `rgba(47,193,131,0.12)` | `success-200` / `rgba(47,193,131,0.32)` | `success-800` / `success-300` | `CheckCircle` |
| Danger | `danger-50` / `rgba(247,113,112,0.12)` | `danger-200` / `rgba(247,113,112,0.32)` | `danger-700` / `danger-300` | `WarningOctagon` |
| Warning | `accent-50` / `rgba(255,183,3,0.10)` | `accent-200` / `rgba(255,183,3,0.30)` | `accent-800` / `accent-300` | `Warning` |
| Info | `secondary-50` / `rgba(33,158,188,0.12)` | `secondary-200` / `rgba(33,158,188,0.32)` | `secondary-800` / `secondary-300` | `Info` |

Status is **never** carried by color alone: always icon + words.

### 6.2 Market direction (prices, P&L, change %)
| Token | Light (text on white) | Dark (text on navy) | Chart line / bar (light / dark) |
|---|---|---|---|
| `--market-up` | `success-700` `#0e6c43` (6.47) | `success-300` `#64d8a4` (6.74) | `success-600` / `success-400` |
| `--market-down` | `danger-600` `#c92f30` (5.34) | `danger-300` `#ff9f9e` (6.06) | `danger-600` / `danger-400` |
| `--market-flat` | `neutral-600` | `#a2cbdd` | `neutral-500` / `primary-400` |
| `--market-up-bg` (tick flash) | `rgba(14,135,84,0.10)` | `rgba(47,193,131,0.14)` | |
| `--market-down-bg` (tick flash) | `rgba(201,47,48,0.08)` | `rgba(247,113,112,0.14)` | |

Direction is always also shown with a sign (`+` / `-`) and the Phosphor `CaretUp` / `CaretDown` (fill) icon, for color-blind users.

---

## 7. Data Visualization Colors

| Role | Light | Dark | Notes |
|---|---|---|---|
| **Gold price series** (the hero series) | line `accent-700` `#b76219`, area `rgba(253,158,2,0.10)` | line `accent-400` `#ffb703`, area `rgba(255,183,3,0.10)` | Area fill is a **flat, single alpha**. No gradient fill under lines |
| USD/IQD series | `secondary-700` | `secondary-400` | |
| Comparison / previous period | `neutral-400` dashed 4 4 | `primary-400` dashed 4 4 | |
| Grid lines | `neutral-100` | `#214a61` | 1px, horizontal only |
| Axis labels | `neutral-600` | `#a2cbdd` | |
| Crosshair | `neutral-500` dashed | `primary-300` dashed | |
| Tooltip | `surface-inverse` `#023047`, text white | `#1d526c`, text white | |

### Categorical order (karat, allocation, multi series)
| Order | Meaning | Light | Dark |
|---|---|---|---|
| 1 | 24K | `accent-700` `#b76219` | `accent-400` `#ffb703` |
| 2 | 22K | `secondary-700` `#006980` | `secondary-400` `#55b4d3` |
| 3 | 21K | `primary-600` `#126782` | `primary-300` `#8ac1d6` |
| 4 | 18K | `neutral-600` `#52636d` | `neutral-300` `#bdcad0` |

Every series gets a **direct label** (value next to the segment/line end). Legends are secondary.

---

## 8. Gradient Policy

**Default: no gradients anywhere.** No gradient buttons, text, borders, cards, icons, chart fills or glows.

**Single exception** (landing page only, max 2 places: hero background and final CTA band):
```css
/* Blue-only, background-only, barely visible. */
--bg-wash-hero: radial-gradient(
  120% 80% at 85% 0%,
  #0a3d57 0%,   /* 3% lighter than canvas */
  #023047 60%
);
```
- Only navy to navy/petrol stops (`#023047`, `#044059`, `#0a3d57`, `#0a536d` max). Never sky, never gold.
- Lightness delta between stops ≤ 5% (OKLCH L). If you can clearly "see" the gradient, it is too strong.
- Never behind body text blocks longer than 2 lines.

---

## 9. Verified Contrast Pairs (WCAG 2.2)

| Pair | Ratio | Result |
|---|---|---|
| `#023047` text on `#ffffff` | 13.85 | AAA |
| `#ffffff` text on `#023047` | 13.85 | AAA |
| `#ffffff` on `dark-surface-3 #1d526c` | 8.48 | AAA |
| `#023047` on gold `#ffb703` | 7.93 | AAA |
| `#023047` on gold hover `#fd9e02` | 6.64 | AA+ |
| `#023047` on gold pressed `#df8019` | 4.77 | AA |
| `#ffffff` on `#126782` | 6.39 | AA+ |
| `#023047` on `#8ecae6` (dark primary button) | 7.74 | AAA |
| `neutral-700` on white | 9.19 | AAA |
| `neutral-600` on white / on `neutral-50` | 6.24 / 5.73 | AA+ |
| `neutral-500` placeholder on white | 4.72 | AA |
| `#d8eef6` on `#1d526c` | 7.06 | AAA |
| `#a2cbdd` on `#023047` / `#144660` / `#1d526c` | 7.99 / 5.84 / 4.90 | AA |
| link `#006980` on white | 6.30 | AA+ |
| link `#8ecae6` on `#144660` | 5.66 | AA |
| up `#0e6c43` on white / down `#c92f30` on white | 6.47 / 5.34 | AA |
| up `#64d8a4` on `#093b54` / down `#ff9f9e` on `#093b54` | 6.74 / 6.06 | AA |
| warning text `accent-800` on `accent-50` | 6.49 | AA |
| `#ffb703` on `#093b54` (gold figure on card) | 6.81 | AA |
| `neutral-400` input border on white | 3.14 | ≥ 3 (non-text) |
| `#518097` input border on `#002337` | 3.77 | ≥ 3 (non-text) |
| focus `#219ebc` on white / `#55b4d3` on navy | 3.14 / 5.84 | ≥ 3 (non-text) |

**Pairs that FAIL and are therefore banned**
- White text on `#219ebc` (3.14). Signal Blue is never a text-bearing fill.
- White text on gold (1.75). Gold always carries navy text.
- `#219ebc` as body text on white (3.14). Use `secondary-700` for text.
- Gold `#ffb703` as text on white (1.75). Use `--text-gold` (`accent-800`).

---

## 10. Implementation

### 10.1 CSS variables (source of truth, `src/styles/tokens.css`)
```css
:root {
  /* ramps (excerpt, include all steps from section 3) */
  --primary-600: #126782; --primary-900: #023047; --primary-950: #001e30;
  --secondary-300: #8ecae6; --secondary-500: #219ebc;
  --accent-400: #ffb703; --accent-500: #fd9e02;
  /* ... */
}

:root, [data-theme="light"] {
  --bg-canvas: #ffffff;
  --bg-subtle: #f7fbfc;
  --surface-1: #ffffff;
  --text-primary: #023047;
  --text-secondary: #394a55;
  --text-tertiary: #52636d;
  --border-default: #d4dee3;
  --border-input: #83949d;
  --border-focus: #219ebc;
  --market-up: #0e6c43;
  --market-down: #c92f30;
  color-scheme: light;
}

[data-theme="dark"] {
  --bg-canvas: #023047;
  --bg-subtle: #002337;
  --surface-1: #093b54;
  --surface-2: #144660;
  --surface-3: #1d526c;
  --text-primary: #ffffff;
  --text-secondary: #d8eef6;
  --text-tertiary: #a2cbdd;
  --border-default: #315b72;
  --border-input: #518097;
  --border-focus: #55b4d3;
  --market-up: #64d8a4;
  --market-down: #ff9f9e;
  color-scheme: dark;
}
```

### 10.2 Tailwind v4 mapping (if Tailwind is used)
```css
@import "tailwindcss";
@theme inline {
  --color-canvas: var(--bg-canvas);
  --color-surface-1: var(--surface-1);
  --color-fg: var(--text-primary);
  --color-fg-muted: var(--text-secondary);
  --color-line: var(--border-default);
  --color-gold: var(--accent-400);
  --color-up: var(--market-up);
  --color-down: var(--market-down);
}
```
Components use `bg-surface-1 text-fg border-line`, never `bg-[#093b54]`.

### 10.3 Lint rules for the agent
- `grep -E "#[0-9a-fA-F]{3,6}" src/components` must return nothing. Hex values live only in `tokens.css`.
- `grep -i "gradient" src` must return only `--bg-wash-hero` usages.
- `grep "#000"` must return nothing.

---

## 11. Do / Don't

| Do | Don't |
|---|---|
| Use navy surfaces to show depth in dark mode | Use black shadows on navy |
| Use gold for the single main action + the gold price | Use gold for badges, icons, dividers "to add warmth" |
| Pair every up/down color with sign + caret icon | Show P&L by color only |
| Use alpha only for status containers, area fills, scrim, focus ring | Use alpha text (`rgba` text colors) |
| Keep the 30% blue as a signal (links, focus, selection, charts) | Paint large sections Signal Blue |
