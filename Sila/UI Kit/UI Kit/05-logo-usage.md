# Sila (صِلة) UI Kit · 05 · Logo Usage

> The logo appears in few, deliberate places, always at a defined size, always in one of two colors. It is never decoration.

---

## 1. Assets

### 1.1 Provided files (PNG, transparent)
```
SIla Logo/
├─ Full Logo/   Full Logo - 1.png (#023047) · 2 (#126782) · 3 (#219ebc) · 4 (#8ecae6) · White   (1320×440, ratio 3:1)
└─ Icon/        Icon - 1.png (#023047) · 2 · 3 · 4 · White                                           (441×440, ratio 1:1)
```

### 1.2 Vector versions (created for this kit, use these in the product)
```
UI Kit/assets/sila-logo.svg   full logo, viewBox 0 0 1320 440, fill="currentColor"
UI Kit/assets/sila-icon.svg   icon,      viewBox 0 0 441 440,  fill="currentColor"
```
- Traced from `Full Logo - 1.png` / `Icon - 1.png`. Each shape is its own `<path>` with `data-piece` and `data-kind` (`bar` ×4, `square` ×4, `word` ×3), so the icon can be animated piece by piece (see 07-motion, logo loader).
- Color is controlled by CSS `color`, so one file serves navy and white.
- The PNGs remain the reference for any print/brand use.

Copy into the app as:
```
public/brand/sila-logo.svg
public/brand/sila-icon.svg
public/brand/favicon.svg, favicon-32.png, apple-touch-icon.png (180), og-image.png (1200×630)
```
and expose one React component:
```tsx
<Logo variant="full" | "icon" tone="navy" | "white" height={32} />
```
`tone="navy"` → `color: #023047`. `tone="white"` → `color: #ffffff`. No other tones are exposed by the component.

---

## 2. Which Color, Where

**Only two versions are used in the product: Navy (Version 1, `#023047`) and White.**

| Background | Logo version | Why |
|---|---|---|
| White / `neutral-25` / `neutral-50` | **Navy (1)** | 13.85:1 |
| Gold `#ffb703` (rare, e.g. premium banner) | **Navy (1)** | 7.93:1. Never white on gold |
| Canvas navy `#023047`, dark surfaces, sidebar (light theme) | **White** | 13.85:1 |
| Petrol `#126782` panels | **White** | 6.39:1 |
| Mist `#8ecae6` / Signal `#219ebc` | **Navy (1)** | Avoid placing the logo on these if possible |
| Photographs | Not allowed | The logo never sits on imagery |

Versions 2, 3 and 4 (petrol, signal, mist) are **not used in the UI**. They are allowed in exactly one place: the landing page's large brand-mark moment (section 5.3), as a tonal build of the icon on navy.

---

## 3. Construction, Clear Space, Minimum Size

### 3.1 Clear space
Unit **x = the size of one small square in the icon** (≈ 1/7 of the icon height).
- Minimum clear space around the full logo and the icon = **1x** on every side.
- In navigation and headers use **1.5x** or more. Nothing (text, border, other icons) enters this zone.

### 3.2 Minimum sizes
| Version | Digital minimum | Recommended UI sizes |
|---|---|---|
| Full logo | height 24px (width 72px) | 28, 32, 40, 52 |
| Icon | 20px (16px only as favicon) | 24, 32, 40, 52, 84 |

Heights come from the icon/type ladders; never a random pixel value.

---

## 4. Placement Map (the only places the logo appears)

### 4.1 Landing page
| Place | Version | Size | Alignment |
|---|---|---|---|
| Nav bar (72px, dark canvas) | Full, White | height 32 | Inline-start, vertically centered, 20px clear space to the first nav item |
| Footer (dark) | Full, White | height 40 | Inline-start of the footer's first column |
| Brand-mark moment (one section, see 5.3) | Icon, tonal build | 220 to 356px | Aligned to the golden grid, never centered on its own for decoration |
| Page loader (first load only) | Icon, White | 52px | Center of viewport |

### 4.2 App (dashboard)
| Place | Version | Size | Notes |
|---|---|---|---|
| Sidebar expanded (272) | Full, White on navy sidebar (light theme) / White on `#093b54` (dark) | height 32 | Top of sidebar, padding 20px, a 64px zone aligned with the topbar height |
| Sidebar collapsed (84) | Icon, White | 32px | Centered in the 84px column |
| Mobile top app bar (56) | Icon, Navy (light) / White (dark) | 28px | Inline-start. The page title sits next to it |
| Auth screens (golden split) | Full, White on the navy brand panel | height 40 | Top inline-start of the brand panel. Mobile: icon 32px in the 136px header band |
| KYC mock sheet header | Icon, White on `--surface-brand` band | 24px | Signals "Sila is verifying you". The government platform is named in text only, never with its logo |
| Success screen (purchase complete) | Not used | - | The focus is the user's gold, not the brand |
| Empty states, cards, tables, charts | **Never** | - | |
| Watermarks on charts or screenshots | **Never** | - | |

### 4.3 System & sharing
| Asset | Spec |
|---|---|
| `favicon.svg` | Icon, White, on a `#023047` square with radius 13/84 of the size (matches `--radius-md` proportion). Works on light and dark browser tabs |
| `favicon-32.png` | Same, rasterized |
| `apple-touch-icon.png` 180×180 | Same, icon occupies 61.8% (1/φ) of the tile, centered |
| `og-image.png` 1200×630 | Canvas `#023047`. Full logo White, height 84, placed at the start of the golden split (inline-start column), one headline line in Plex Arabic 600 next to it. No gradient, no glow |
| PWA manifest icons 192/512 | Same as apple-touch |

---

## 5. Motion With the Logo

1. **Page loader** (first app load, only if loading > 400ms): the 8 icon pieces assemble (bars slide in along their axes, squares scale in with stagger), then hold. Library: Anime.js (see 07-motion). Duration 890ms total. Reduced motion: the static icon fades in (130ms).
2. **Nav logo**: static. No hover animation, no rotation, no pulse. The logo is a home link (`aria-label="صِلة، الصفحة الرئيسية"`), with a focus ring only.
3. **Landing brand-mark moment** (one section max): the icon built large from the tonal versions (piece colors: `#126782`, `#219ebc`, `#8ecae6`, White on navy canvas) assembling on scroll, symbolizing "connection" (صِلة). This is the only place versions 2 to 4 appear, and only as flat fills.

---

## 6. Misuse (all banned)

- Recoloring outside Navy/White (no gold logo, no green, no gradient logo).
- Stretching, squashing, rotating, skewing, mirroring for RTL (the logo is identical in Arabic and English layouts).
- Adding shadows, glows, outlines, 3D, blur, glass effects.
- Placing on photos, patterns, busy charts, or low-contrast backgrounds (`#219ebc`, `#8ecae6` with white logo).
- Rebuilding the wordmark with a font, or pairing the icon with "Sila" typed in Montserrat as a lockup.
- Separating the icon and wordmark and rearranging them (stacked version does not exist; use the icon alone instead).
- Repeating the logo more than once in the same viewport (nav + footer are never visible together; the loader disappears before the nav renders).
- Using the logo as a bullet, a loading spinner inside buttons, or as a background pattern.

---

## 7. Checklist

- [ ] Only Navy (1) or White versions in the UI.
- [ ] Size is one of the listed tokens; clear space ≥ 1x (1.5x in nav).
- [ ] Logo appears only in the placement map (section 4).
- [ ] Logo has `alt`/`aria-label` in the current locale and links home in nav/sidebar.
- [ ] Favicon, touch icon and OG image generated from the SVG, not upscaled PNG.
