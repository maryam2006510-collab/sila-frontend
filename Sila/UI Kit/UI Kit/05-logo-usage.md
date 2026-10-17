# Sila (صِلة) UI Kit · 05 · Logo Usage

> The mark appears in few, deliberate places, always at a defined size, always in one of two colors. It is never decoration.

---

## 1. The Mark

### 1.1 Concept
Sila's logo is a **single symbol with no wordmark**: an infinity loop cut by one slanted stroke.

- **The loop** is an unbroken connection between investors and sellers: صِلة means "connection".
- **The stroke** crosses the loop like the bar of a currency sign, so the mark also reads as money and value.
- **The slant** is the same ~20° angle the UI already uses (the Sila cut, 06-style §3.1).
- **Read right to left**, the shape also spells صِلة: ص, then ل, then ة.

The brand never sets the word "صِلة" next to the mark. There is no lockup, no stacked version and no wordmark version: the symbol is the whole logo.

### 1.2 Proportions
Horizontal, **1000 × 449.91** (about 2.22 : 1). In code: `width = Math.round(height × 1000 / 449.91)`.

---

## 2. Versions and Color

| Version | Color | Where |
|---|---|---|
| **Navy** | `#023047` | **Product UI**, on light surfaces |
| **White** | `#ffffff` | **Product UI**, on dark surfaces |
| Gold | `#ffb703` | Print and marketing only, never in the app UI |
| Black | `#05131c` | Print and marketing only (one-color print), never in the app UI |

**Only Navy and White are used in the product.** In code the mark is one SVG with `fill="currentColor"`, and the `<Logo>` component sets the color through `tone`:

| `tone` | Color | Use |
|---|---|---|
| `navy` | `--color-logo-navy` (`primary-900`) | Always-light surfaces |
| `white` | `#ffffff` | Always-dark surfaces: the sidebar, the auth brand panel, the KYC sheet band |
| `auto` | `--logo-on-canvas` | The page canvas, which follows the theme: Navy in light, White in dark |

| Background | Version | Contrast |
|---|---|---|
| White / `neutral-25` / `neutral-50` | Navy | 13.85:1 |
| Gold `#ffb703` (rare, e.g. a Premium banner) | Navy | 7.93:1. Never White on gold |
| Canvas navy `#023047`, dark surfaces, the sidebar | White | 13.85:1 |
| Petrol `#126782` panels | White | 6.39:1 |
| Mist `#8ecae6` / Signal `#219ebc` | Avoid | Too little contrast for the slash |
| Photographs, patterns, busy charts | Not allowed | |

---

## 3. Clear Space and Minimum Size

### 3.1 Clear space
**x = ¼ of the mark's height**, on every side. Nothing (text, border, another icon, the edge of a container) enters this zone.

### 3.2 Minimum size
- **Screen: 48px wide** (height 22). Below that the slash disappears.
- **Print: 15mm wide.**

### 3.3 UI sizes (`<Logo height>`)
| Height | Width | Clear space x | Used for |
|---|---|---|---|
| 22 | 49 | 5.5 | Mobile top bar, collapsed sidebar |
| 24 | 53 | 6 | KYC sheet band, landing demo screen |
| 28 | 62 | 7 | (available) |
| 32 | 71 | 8 | Landing nav, expanded sidebar, auth mobile band |
| 40 | 89 | 10 | Footer, auth brand panel, page loader, 404 |
| 52 | 116 | 13 | (available) |
| 84 | 187 | 21 | (available) |

Heights come from the type and icon ladders, never a random pixel value.

### 3.4 The square icon
`sila-icon.svg` is the mark centred in a 1:1 square at 88% of its width. Inside a square the mark is drawn smaller, so **the square icon reaches the 48px minimum only from a side of 55px**: in the UI it is used at 84 only, and in the landing brand moment (section 5). Anywhere a small logo is needed, use the full mark at height 22 to 32 instead.

---

## 4. Placement Map (the only places the mark appears)

### 4.1 Landing page
| Place | Tone | Height | Notes |
|---|---|---|---|
| Nav bar | `auto` | 32 | Inline-start, vertically centred, home link. Leaves the bar while the footer is on screen |
| Footer | `auto` | 40 | Inline-start of the footer's first column |
| Brand moment (section 5) | `auto` | Square icon, 220 to 356px box | One per page |
| Demo screen (KYC preview) | `white` | 24 | On the brand band of the preview |

### 4.2 App
| Place | Tone | Height | Notes |
|---|---|---|---|
| Sidebar expanded | `white` | 32 | Top of the sidebar, in the 64px zone aligned with the topbar |
| Sidebar collapsed (84) | `white` | 22 | Full mark, centred in the 84px column (49px + clear space fits) |
| Mobile top bar | `auto` | 22 | Inline-start, the page title next to it |
| Auth screens | `white` | 40 on the brand panel, 32 in the mobile header band | Home link |
| KYC sheet header | `white` | 24 | On the `--surface-brand` band. The government platform is named in text only |
| Page loader | `auto` | 40 | Above the loading squares, static |
| 404 page | `auto` | 40 | Home link |
| Success screens, empty states, cards, tables, charts | Never | | |
| Watermarks on charts or screenshots | Never | | |

### 4.3 System and sharing
| Asset | Spec |
|---|---|
| `favicon.svg` | Navy mark on a white rounded tile. Works on light and dark tabs |
| `favicon-32.png` (+ 16, 48 in the kit) | Same, rasterized |
| `apple-touch-icon.png` 180 | Primary app icon: Navy mark on white |
| `icon-192.png`, `icon-512.png` | PWA icons, same |
| `og-image.png` 1200 × 630 | Navy mark centred on a light canvas with a soft mist wash |

### 4.4 App icon
- **Primary: Navy mark on white.**
- Alternates: White on navy, Navy on gold (marketing and store art only).
- The mark sits centred with its clear space; the tile corners follow the platform's mask.

---

## 5. Motion With the Mark

1. **Nav and app**: static. No hover animation, no rotation, no pulse. The mark is a home link (`aria-label="صِلة، الصفحة الرئيسية"`) with a focus ring only.
2. **Page loader**: the static mark above the three loading squares. The mark itself never spins or pulses.
3. **Landing brand moment** (one section): the mark assembles as the section scrolls (GSAP scrub). The loop's two pieces slide in from opposite sides and meet in the centre, then the slash drops in along its own slant. One color throughout (`auto`). Reduced motion: the assembled mark, static. The SVG's three pieces carry `data-piece="1"` (loop), `"2"` (inner piece), `"3"` (slash, on a wrapping `<g>` because its path has its own transform, which the animation would overwrite).

---

## 6. Misuse (all banned)

- Stretching, squashing, rotating, skewing, or mirroring for RTL (the mark is identical in Arabic and English layouts).
- Recoloring outside Navy / White in the UI (no gold or black mark in the app, no gradient, no tonal multi-color build).
- Shadows, glows, outlines, 3D, blur, glass, or fading the mark.
- Placing it on photos, patterns, busy charts, or low-contrast backgrounds.
- Typing "صِلة" or "Sila" next to it as a lockup, or rebuilding it with a font.
- Showing it under 48px wide, or letting anything enter its clear space.
- Repeating it more than once in the same viewport.
- Using it as a bullet, a spinner inside buttons, or a background pattern.

---

## 7. Files

Source kit: `Sila/Brand/Sila-Logo-Kit/` (guidelines: `Sila-Brand-Identity.pdf`).

| File | Use |
|---|---|
| `SVG/sila-mark.svg` | Main mark, `fill="currentColor"`, viewBox `0 0 1000 449.91` |
| `SVG/sila-icon.svg` | Mark centred in a 1:1 square, `currentColor` |
| `SVG/sila-mark-{navy,white,gold,black}.svg` | Fixed-color versions |
| `SVG/sila-app-icon-*.svg`, `PNG/app-icon/*` | App icons (1024) |
| `PNG/transparent/*` | Transparent PNGs, 512 / 1024 / 2048 wide |
| `PDF/*` | Vector files for print |
| `web/*` | Favicons (SVG, 16, 32, 48), apple-touch 180, PWA 192 / 512, og-image |

In the app:
```
src/assets/brand/sila-logo.svg   the mark (inlined by <Logo>)
src/assets/brand/sila-icon.svg   the square icon, paths with data-piece 1 to 3
public/brand/                    the same two, served as files
public/favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, og-image.png
```
```tsx
<Logo variant="full" tone="navy" | "white" | "auto" height={22 | 24 | 28 | 32 | 40 | 52 | 84} />
<Logo variant="icon" height={84} />
```

---

## 8. Checklist

- [ ] Only Navy or White in the UI.
- [ ] Never under 48px wide; height is one of the listed sizes.
- [ ] Clear space of ¼ the mark's height on every side.
- [ ] Only in the placement map (section 4), once per viewport.
- [ ] `aria-label` in the current locale; links home in nav, sidebar and auth.
- [ ] Favicon, touch icon and OG image come from the kit's files, not upscaled PNGs.
