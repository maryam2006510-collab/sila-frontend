# Sila (صِلة) UI Kit · 03 · Icon System

> Library: **Phosphor Icons** only (`@phosphor-icons/react`). No other icon set, no emoji, no hand-drawn SVG icons.
> Rule of the system: **Regular (outlined) = default. Fill = active / selected.** Nothing else.

---

## 1. Setup

```bash
npm i @phosphor-icons/react
```
```tsx
import { IconContext } from "@phosphor-icons/react";

<IconContext.Provider value={{ size: 20, weight: "regular", mirrored: false }}>
  <App />
</IconContext.Provider>
```
- Use the `*Icon` suffixed exports of the current Phosphor React version (for example `HouseIcon`, `ChartLineUpIcon`). If the installed version only exports un-suffixed names, use those. Do not mix the two styles.
- Import named icons only (tree-shaking). Never import the full set.

---

## 2. Weights: the only two allowed

| State | Weight | Examples |
|---|---|---|
| Default, idle, informational | `regular` (outlined, 1.5px optical stroke) | Nav items at rest, icons in inputs, buttons, list rows, empty states |
| Active, selected, on, current page, checked | `fill` | Current sidebar item, selected tab, selected karat chip, toggled favourite, active filter, verified badge |

Banned weights: `thin`, `light`, `bold`, `duotone`. Duotone creates a two-tone look that fights the flat, no-gradient style; thin/light disappear for older eyes.

Semantic exceptions that are **always fill** because they are status marks, not controls:
- Market direction carets: `CaretUp` / `CaretDown` (fill), next to deltas.
- Status icons inside alerts and toasts: `CheckCircle`, `Warning`, `WarningOctagon`, `Info` (fill), size 20.
- Verified mark `SealCheck` (fill) next to a KYC-verified name.

### 2.1 The Regular → Fill transition
```tsx
// src/components/ui/StateIcon.tsx
type Props = { icon: Icon; active: boolean; size?: number; label?: string };
export function StateIcon({ icon: I, active, size = 20, label }: Props) {
  return (
    <span className="state-icon" aria-hidden={!label} aria-label={label}>
      <I size={size} weight="regular" className="si-regular" data-on={!active} />
      <I size={size} weight="fill" className="si-fill" data-on={active} />
    </span>
  );
}
```
```css
.state-icon { display: inline-grid; }
.state-icon > svg { grid-area: 1 / 1; transition: opacity var(--dur-2) var(--ease-standard), transform var(--dur-3) var(--ease-out-expo); }
.state-icon > svg[data-on="false"] { opacity: 0; transform: scale(0.88); }
.state-icon > svg[data-on="true"]  { opacity: 1; transform: scale(1); }
@media (prefers-reduced-motion: reduce) { .state-icon > svg { transition: none; } }
```
Both glyphs are stacked in the same grid cell, so switching never changes layout width.

---

## 3. Sizes (tied to the type scale and 4px grid)

| Token | Size | Paired with | Touch target around it |
|---|---|---|---|
| `icon-xs` | 16px | `body-sm` text, badges, table inline | inside a 32px control |
| `icon-sm` | 20px | `body` / `label` 16px text, buttons md/lg, inputs, nav | 40 to 48px |
| `icon-md` | 24px | `h4` titles, sidebar collapsed, mobile tab bar | 48px |
| `icon-lg` | 32px | Feature tiles, empty states (inside a 64px tile) | n/a |
| `icon-xl` | 52px | Landing trust panels only, success screen | n/a |

Rules:
- Icon size is never a random number. Only the 5 tokens above.
- Icon + text gap: 8px (sm, md), 12px (lg). Icons are vertically centered on the text's line box, not on the baseline.
- Stand-alone icon buttons: minimum **44×44** hit area (48 on mobile), even if the glyph is 20px.

---

## 4. Color

| Context | Color token |
|---|---|
| Default icon | `--text-secondary` |
| Icon inside a primary text row / title | `--text-primary` |
| Active/selected (fill) in nav, tabs, chips | `--state-selected-indicator` (light `#023047`, dark `#8ecae6`) |
| Disabled | `--text-disabled` |
| Status icons | matching status token (01-color, section 6) |
| Market carets | `--market-up` / `--market-down` |
| Icon on accent button | `--text-on-accent` (navy) |
| Premium mark | `--text-gold` |

Icons never use gold except: premium mark (`Crown`) and promoted mark (`Megaphone`). Icons are never multi-colored.

---

## 5. Icon Map (one concept → one icon, everywhere)

Consistency lock: once an icon means something, it means only that thing in the whole product.

### 5.1 Navigation
| Concept | Arabic label | Icon |
|---|---|---|
| Dashboard | لوحة التحكم | `SquaresFour` |
| Market / listings | السوق | `Storefront` |
| Live prices | الأسعار | `ChartLineUp` |
| Smart matching (AI) | المطابقة الذكية | `Target` |
| Portfolio | محفظتي | `Wallet` |
| Transactions history | سجل العمليات | `ClockCounterClockwise` |
| Premium insights | رؤى Premium | `Crown` |
| Seller: my listings | عروضي | `Tag` |
| Seller: sales log | سجل المبيعات | `Receipt` |
| Settings | الإعدادات | `GearSix` |
| Notifications | الإشعارات | `Bell` |
| Profile / account | الحساب | `UserCircle` |
| Sign out | تسجيل الخروج | `SignOut` |
| Language | اللغة | `Translate` |
| Theme | المظهر | `Moon` / `Sun` |

### 5.2 Domain
| Concept | Icon |
|---|---|
| Gold asset / listing | `Coins` |
| Weight in grams | `Scales` |
| Karat | `Diamond` |
| Budget | `Money` |
| USD/IQD rate | `CurrencyDollar` |
| Commission | `Percent` |
| Price calculation / preview | `Calculator` |
| AI insight line (risk analysis, match reason) | `Sparkle` (the only place Sparkle is used) |
| KYC / identity | `IdentificationCard` |
| Digital signature / verified ownership | `Signature` |
| Verified (badge) | `SealCheck` (fill) |
| Security / protected execution | `ShieldCheck` |
| Integrity failure | `ShieldWarning` |
| Promoted listing | `Megaphone` |
| Suspended listing | `PauseCircle` |
| Sold out | `Archive` |
| Live data indicator | `Broadcast` |
| Price updated / refresh | `ArrowsClockwise` |
| Trend up / down (chart summaries) | `TrendUp` / `TrendDown` |
| Deltas (small, next to numbers) | `CaretUp` / `CaretDown` (fill) |

### 5.3 Actions & UI
| Action | Icon |
|---|---|
| Search | `MagnifyingGlass` |
| Filter | `SlidersHorizontal` |
| Sort | `ArrowsDownUp` |
| Add | `Plus` |
| Close | `X` |
| Confirm / done | `Check` |
| Copy (IDs, signature) | `Copy` → `Check` for 1.6s after copy |
| Show / hide password | `Eye` / `EyeSlash` |
| Lock (secure field, price locked) | `LockSimple` |
| Info tooltip | `Info` |
| Help | `Question` |
| More | `DotsThree` |
| External link | `ArrowUpRight` |
| Back / forward | `ArrowRight` / `ArrowLeft` (mirrored, see 6) |
| Expand / collapse | `CaretDown` / `CaretUp` (regular) |

---

## 6. RTL Mirroring

Mirror (`mirrored` prop = `dir === "rtl"`) icons that express **reading direction**:
`ArrowLeft`, `ArrowRight`, `CaretLeft`, `CaretRight`, `ArrowUpRight` (external), `SignOut`, `List` (only if the drawer side flips), `ClockCounterClockwise`.

Never mirror icons that express **real-world meaning or data direction**:
`TrendUp`, `TrendDown`, `ChartLineUp` (charts keep time left to right, see 06-style), `CaretUp`/`CaretDown`, `Check`, `MagnifyingGlass`, `Coins`, `Signature`, `Crown`, clocks.

```tsx
const dir = useDirection(); // "rtl" | "ltr"
<CaretRightIcon mirrored={dir === "rtl"} />
```

---

## 7. Accessibility

- Decorative icon (next to a visible label): `aria-hidden="true"`.
- Icon-only button: `aria-label` in the current locale + tooltip on hover/focus (delay 400ms).
- Never convey meaning with an icon alone in critical flows (checkout, KYC): icon + text.
- Status icons in alerts are paired with a text title.

---

## 8. Icon Containers (feature tiles, empty states)

When an icon needs a container (empty state, feature tile, KYC steps):
- Square tile, size 64 (icon 32) or 84 (icon 52 on landing), radius `--radius-md` (13px).
- Background `--bg-muted`, border 1px `--border-subtle`. No circles, no colored blobs, no gradients, no glow.
- Optional brand motif: the tile's inline-end top corner uses the **Sila cut** (20° slant from the logo, see 06-style) only on landing trust panels.

---

## 9. Don't

- No emoji, anywhere (including toasts and empty states).
- No mixing Phosphor weights beyond regular/fill.
- No icons as bullet points in long lists.
- No colored icon backgrounds in rainbow variety; tiles are neutral.
- No icon without a label in primary navigation on desktop (collapsed sidebar shows tooltips).
