# Sila (صِلة) UI Kit · 07 · Motion System

> Libraries: **GSAP** (+ ScrollTrigger, SplitText, `@gsap/react`), **Motion** (`motion/react`), **Anime.js v4**.
> Each library owns a clear job. Motion must be smooth (60fps), light, and always **motivated**: it shows hierarchy, tells a story, gives feedback, or shows that data changed. If an animation cannot be justified in one sentence, it is removed.

---

## 1. Library Ownership (who animates what)

| Library | Owns | Where it loads |
|---|---|---|
| **Motion** (`motion/react`) | All React UI state motion: route transitions, modals/sheets, dropdowns, toasts, tab and segmented indicators (`layoutId`), list add/remove (`AnimatePresence`), **digit roll** of live prices, simple in-view reveals, hover/press springs where CSS is not enough | App + landing (core bundle) |
| **GSAP** + ScrollTrigger + SplitText | **Landing page only**: scroll-driven storytelling, pinned product walkthrough, the single horizontal section, scrubbed timelines, hero headline split reveal, brand-mark scroll assembly | Landing route chunk only (dynamic import). Never in the app bundle |
| **Anime.js v4** | **SVG and small choreography**: sparkline/line drawing (`svg.createDrawable`), checkmark drawing, logo loader assembly (8 pieces), square-marker staggers, AI "thinking" squares, gold-bar stacking in the landing calculator | App + landing, per component |
| **CSS transitions** | Color, border, background, icon regular↔fill crossfade, skeleton pulse, live-square pulse | Everywhere |

### Isolation rules (prevent frame fights and bugs)
1. **One owner per DOM node.** An element is animated by exactly one library for its whole life.
2. GSAP-owned sections (pinned/scrubbed) contain **no Motion-animated children**. Components embedded in them (for example the dashboard preview) render with `animated={false}`; GSAP drives only their wrapper transforms and the demo-state progression.
3. Motion never animates an element inside a GSAP `pin` container.
4. Anime.js is used inside a `createScope({ root })` and always `revert()`ed on unmount.
5. GSAP always inside `useGSAP()` (from `@gsap/react`) with a `scope`, so everything is reverted on unmount/route change.
6. No `window.addEventListener("scroll")`, no `window.scrollY` in React state, no rAF loops that set React state. Use ScrollTrigger, Motion `useScroll`, or IntersectionObserver.

---

## 2. Tokens

### 2.1 Duration (Fibonacci, ms)
| Token | ms | Use |
|---|---|---|
| `--dur-1` | 80 | Press feedback, icon swap |
| `--dur-2` | 130 | Hover color/border, exits of small elements |
| `--dur-3` | 210 | Tooltips, dropdowns, route fade, card hover lift |
| `--dur-4` | 340 | Modals, sheets, tab indicator, digit roll |
| `--dur-5` | 550 | Section reveals, tick flash, success check draw |
| `--dur-6` | 890 | Hero entrance, logo loader, sparkline draw, count-up |
| `--dur-7` | 1440 | Ambient loops (live square pulse, skeleton pulse) |

Rule: exits are faster than entrances (≈ 0.6×). Nothing in the app is longer than 890ms. Nothing blocks input while animating.

### 2.2 Easing
| Token | CSS | GSAP | Anime.js v4 | Use |
|---|---|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | `power2.out` | `outQuad` | State changes, hover |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | `expo.out` | `outExpo` | Entrances, reveals, draws |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | `power2.in` | `inQuad` | Exits |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | `power3.inOut` | `inOutCubic` | Moving between two places |
| scrub | `none` | `none` + `scrub: 0.8` | n/a | Scroll-linked timelines |

Springs (Motion):
```ts
export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 1 },  // indicators, toggles, digit roll
  calm:   { type: "spring", stiffness: 180, damping: 26, mass: 1 },  // sheets, cards, layout
} as const;
```
No bouncy springs (damping ratio < 0.7) anywhere: money UI must not wobble.

### 2.3 Distance & scale
- Entrance offsets: 12px (small), 20px (cards), 32px (sections). Never more than 32px.
- Scale entrances: from 0.96 (modals), never from 0.
- Hover lift: `translateY(-2px)` for interactive cards only.
- Press: `scale(0.98)`.

### 2.4 Stagger
- 34ms (dense lists, digits), 55ms (cards, words), 89ms (hero sequence).
- Max total stagger per group: 340ms (lists longer than 8 items animate the first 8 only).

---

## 3. App Motion Catalog

| # | Moment | Motion | Library | Duration/ease |
|---|---|---|---|---|
| 1 | Button hover / press | Color change; press `scale(0.98)` | CSS | 130 / 80 |
| 2 | Card hover (interactive) | Border to strong, lift -2px | CSS | 210 standard |
| 3 | Route change | Old page fade out; new page fade in + y 12 → 0 | Motion `AnimatePresence mode="wait"` | 130 out / 210 in |
| 4 | Modal / dialog | Scrim fade; dialog opacity + scale 0.96 → 1 | Motion | 210 / 340 expo |
| 5 | Mobile sheet | Slide from bottom, drag to dismiss | Motion `calm` spring | ~340 |
| 6 | Tabs / segmented control | Indicator slides (`layoutId`) | Motion `snappy` | ~340 |
| 7 | Dropdown / popover | Fade + y 8 → 0, transform-origin at trigger | Motion | 210 expo |
| 8 | Toast | y 20 → 0 + fade; exit fade | Motion | 340 / 130 |
| 9 | **Live price update** | Changed digits roll (only the changed columns); delta chip tick flash (bg up/down tint → transparent) | Motion (digits) + CSS (flash) | 340 snappy / 550 |
| 10 | **Sparkline / chart line first view** | Path draws from start to end once | Anime `svg.createDrawable` | 890 outExpo |
| 11 | Chart live append | Lightweight Charts native update, no extra animation | - | - |
| 12 | KPI count-up (first view only) | 0 → value, tabular digits so width is stable | Anime `animate` on a number object + `utils.round` | 890 outExpo |
| 13 | Skeleton | Opacity pulse between `--skeleton-base` and `--skeleton-highlight` (**no gradient shimmer**) | CSS | 1440 loop |
| 14 | Live indicator (square) | Opacity 1 → 0.4 → 1 | CSS | 1440 loop |
| 15 | AI thinking (Smart Match, risk analysis) | 3 small squares pulse in sequence + honest status line | Anime stagger 89 | loop until done |
| 16 | Smart Match results | Cards enter y 20 → 0, stagger 55; reason line fades after card | Motion | 550 expo |
| 17 | KYC verifying | Stepper segments fill one by one, then `SealCheck` swaps regular → fill | Motion + CSS | 340 per segment |
| 18 | Purchase success | Checkmark draws, then new gold balance counts up. **No confetti** | Anime | 550 + 890 |
| 19 | Form error | Field border to danger + message fades in (y 4). **No shaking** | CSS | 210 |
| 20 | Copy signature hash | `Copy` → `Check` icon crossfade, back after 1.6s | CSS | 80 |
| 21 | Logo loader (first load > 400ms) | 4 bars slide in along their axis (±32px) + fade, 4 squares scale 0.6 → 1, stagger 55 | Anime `createTimeline` | 890 total |

### 3.1 Live price rules
- Visual updates at most **once per second** even if data arrives faster (throttle in the store).
- Only the digits that changed roll; unchanged digits stay still.
- Flash applies to the delta chip background only, never the whole card.
- When the tab is hidden (`document.visibilityState === "hidden"`), animations stop; on return the value snaps to the latest without replaying history.

---

## 4. Landing Page Choreography (GSAP)

### 4.1 Setup
```tsx
// src/features/landing/motion/setup.ts  (dynamically imported by the landing route)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });
// Recalculate after fonts load (Arabic metrics change line breaks):
document.fonts.ready.then(() => ScrollTrigger.refresh());
```
All landing timelines live in `gsap.matchMedia()` with three contexts: `desktop` (≥ 1024, no reduced motion), `mobile` (< 1024, no reduced motion), `reduce` (`prefers-reduced-motion: reduce`).

### 4.2 Arabic text splitting (critical)
**Never split Arabic into characters.** Character splitting breaks letter joining and destroys the word shapes.
```ts
const split = SplitText.create(el, { type: "words,lines", mask: "lines", linesClass: "line" });
gsap.from(split.words, { yPercent: 100, opacity: 0, duration: 0.89, ease: "expo.out", stagger: 0.055 });
```
- Arabic: `words` or `lines` only. Latin: `words`/`lines` too (chars allowed only for single short Latin words, never for body).
- Revert the split after the animation (`onComplete: () => split.revert()`), so the text is back to normal DOM (selection, screen readers, resize).

### 4.3 Hero (on load, not scroll)
Sequence (total ≤ 1.2s): headline words (stagger 55) → subtext fade (y 12) → CTAs fade → live price card fades in and its chart line draws (Anime, 890) → price starts ticking. The CTA is visible and clickable from the first frame (only its opacity animates from 0.001, no pointer blocking).

### 4.4 Scroll-driven product walkthrough (pinned)
```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 4}`,  // 5 steps → 4 transitions
        pin: true,
        scrub: 0.8,
        snap: { snapTo: "labelsDirectional", duration: 0.34, ease: "power2.inOut" },
        invalidateOnRefresh: true,
      },
    });
    tl.addLabel("prices")
      .to(stepRefs.current[0], { autoAlpha: 0, y: -20 })
      .to(stepRefs.current[1], { autoAlpha: 1, y: 0 }, "<")
      .call(() => setDemoStep(1)).addLabel("match");
    // ... repeat for "preview", "verify", "own"
  });
  return () => mm.revert();
}, { scope: sectionRef });
```
- Snapping to labels makes each step land cleanly (no half states).
- The demo device frame never scales more than 1 → 0.94 range; screen content changes by crossfade + small y.
- A progress rail of 5 Sila Cut segments fills with scroll (`scaleX` from 0 → 1 with `transform-origin` at the inline-start edge).
- `setDemoStep` is called at labels only (not every frame) so React re-renders at most 5 times across the whole scroll.
- Mobile (< 1024): **no pin**. Steps become stacked blocks, each revealing on enter (Motion `whileInView`, once).

### 4.5 The single horizontal section (pinned pan)
```tsx
mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
  const track = trackRef.current!;
  const distance = () => track.scrollWidth - window.innerWidth;
  const isRTL = document.documentElement.dir === "rtl";
  gsap.to(track, {
    x: () => (isRTL ? distance() : -distance()),   // RTL pans the other way
    ease: "none",
    scrollTrigger: {
      trigger: wrapRef.current,
      start: "top top",
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
});
```
- Panels have fixed width (`--g-5` 576px or 80vw on tablets) and fixed height (`--g-5`).
- Inner panel details (icon tile, figure) can use `containerAnimation` for small parallax (max 24px).
- Mobile (< 768): no pin; native horizontal `scroll-snap-type: x mandatory` carousel with visible next-card peek (20px), swipe only, no auto-play.
- Only **one** horizontal section exists on the whole site.

### 4.6 Other scroll moments
| Section | Motion | Library |
|---|---|---|
| Market ticker strip | Continuous marquee, 40px/s, pauses on hover/focus, the only marquee on the page | CSS keyframes on `transform` |
| Price calculator | Gold bars stack as grams increase (each bar y 20 → 0, stagger 34) | Anime |
| Commission tiers | Tier bars grow `scaleY` when in view, once | Motion `whileInView` |
| Brand-mark moment | Logo pieces assemble scrubbed by scroll (tonal navy/blue fills) | GSAP scrub (pieces are GSAP-owned there) |
| Section reveals | y 32 → 0 + fade, once, `amount: 0.3` | Motion `whileInView` |

Parallax: allowed only on the decorative gold-bar element, max 40px travel. No parallax on text.

---

## 5. Code Recipes

### 5.1 Digit roll (Motion)
```tsx
import { motion } from "motion/react";
function Digit({ d }: { d: string }) {
  if (!/\d/.test(d)) return <span className="num-sep">{d}</span>;
  return (
    <span className="digit-col" aria-hidden>
      <motion.span className="digit-stack" animate={{ y: `${-Number(d) * 10}%` }} transition={spring.snappy}>
        {"0123456789".split("").map((n) => <span key={n}>{n}</span>)}
      </motion.span>
    </span>
  );
}
export function RollingNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const text = format(value);
  return (
    <bdi className="num rolling" aria-live="polite" aria-label={text}>
      {text.split("").map((c, i) => <Digit key={i} d={c} />)}
    </bdi>
  );
}
```
```css
.digit-col { display: inline-block; height: 1lh; overflow: hidden; }   /* 1 line box */
.digit-stack { display: flex; flex-direction: column; }
.digit-stack > span { height: 1lh; }
```
Screen readers get the final value via `aria-label`; `aria-live="polite"` only on the main price, and announcements are throttled to one per 10s.

### 5.2 Sparkline draw (Anime.js v4)
```tsx
import { createScope, animate, svg } from "animejs";
useEffect(() => {
  if (reduceMotion) return;
  const scope = createScope({ root: rootRef }).add(() => {
    animate(svg.createDrawable(".spark-line"), { draw: ["0 0", "0 1"], duration: 890, ease: "outExpo" });
    animate(".spark-end", { scale: [0.6, 1], opacity: [0, 1], delay: 760, duration: 340, ease: "outExpo" });
  });
  return () => scope.revert();
}, [reduceMotion]);
```

### 5.3 Logo loader (Anime.js v4)
```tsx
import { createTimeline, stagger } from "animejs";
const tl = createTimeline({ defaults: { ease: "outExpo", duration: 550 } });
tl.add('[data-kind="bar"]', { opacity: [0, 1], translateX: (el, i) => [[32, 0, -32, 0][i], 0], translateY: (el, i) => [[0, 32, 0, -32][i], 0], delay: stagger(55) })
  .add('[data-kind="square"]', { opacity: [0, 1], scale: [0.6, 1], delay: stagger(55) }, "-=340");
```
Uses `assets/sila-icon.svg` whose paths carry `data-kind`. The agent must check each bar's real orientation and set the slide axis per piece so every bar slides along its own length.

### 5.4 Reduced motion (mandatory)
```tsx
<MotionConfig reducedMotion="user">…</MotionConfig>
```
- GSAP: the `reduce` matchMedia context sets final states instantly (no pin, no scrub, no split).
- Anime: check `window.matchMedia("(prefers-reduced-motion: reduce)")` before creating animations; set end states with `utils.set`.
- CSS: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; } }`
- Live price in reduced motion: value swaps without rolling; flash replaced by a static caret color.

---

## 6. Performance Budget & Rules

- Animate **only `transform` and `opacity`** (plus `clip-path`/SVG `stroke-dashoffset` for draws). Never `width`, `height`, `top`, `left`, `margin`, `box-shadow` in loops.
- `will-change: transform` only during an animation (GSAP/Motion add and remove it); never permanently on many nodes.
- Target 60fps on a mid-range Android phone; INP < 200ms; CLS < 0.1; LCP < 2.5s.
- JS budget: Motion (tree-shaken, `LazyMotion` + `domAnimation` in the app) + Anime.js modules imported per function (`import { animate } from "animejs"`) + GSAP only in the landing chunk.
- Pause off-screen loops (marquee, pulses) with IntersectionObserver.
- Pinned sections: `anticipatePin: 1`, test resize and orientation change, `invalidateOnRefresh: true`, call `ScrollTrigger.refresh()` after images/fonts/charts mount.
- No smooth-scroll hijacking library. Native scroll + scrubbed timelines give smoothness without taking control from the user.
- Test in both `dir="rtl"` and `dir="ltr"`: every x-axis animation must respect direction.

---

## 7. Motion QA Checklist

- [ ] Every animation has a one-sentence reason (hierarchy, story, feedback, data change).
- [ ] One library per element; GSAP only on the landing; all scopes reverted on unmount.
- [ ] Arabic never split by characters.
- [ ] Durations/easings only from tokens; exits faster than entrances.
- [ ] No bounce, no shake, no confetti, no infinite loops on non-status elements.
- [ ] Reduced motion fully supported in all three libraries + CSS.
- [ ] Pins start at `top top`, snap cleanly, and survive resize in RTL and LTR.
- [ ] No jank: Performance panel shows no long tasks > 50ms during scroll.
