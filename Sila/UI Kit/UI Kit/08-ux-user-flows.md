# Sila (صِلة) UI Kit · 08 · UX & User Flows

> Built from the product documents `Product/product_vision.md` and workflows `Product/00` to `Product/08`. Those files are the functional truth (endpoints, rules, error codes). This file defines **how each step looks, reads and behaves**.
> Audience: investors aged 30 to 60 and gold sellers in Iraq. The experience must be **simple, calm, professional and visibly safe**.

---

## 1. UX Principles for This Audience

1. **Clarity over cleverness.** One task per screen, one primary action, plain Arabic, no jargon. Every number has a label and a unit.
2. **Money is never a surprise.** Price, commission (rate + amount) and total are visible before any confirm. The confirm button repeats the total.
3. **Nothing irreversible happens by accident.** Purchase = choose → review → explicit confirm. No auto-execution of money actions, ever (including after KYC).
4. **Trust is shown, not claimed.** Live timestamps, verified seals, signature checks, receipts and a permanent history are visible UI, not marketing text.
5. **The user keeps their place.** Interruptions (login expiry, KYC) return the user to the exact step with all inputs preserved.
6. **Comfortable for older eyes and hands.** 16px+ text, 48px controls, strong contrast, no time pressure, no tiny icon-only actions.
7. **AI helps, the user decides.** Every AI suggestion explains itself and offers the manual path next to it.

---

## 2. Information Architecture

### 2.1 Routes
| Area | Route | Who | Source workflow |
|---|---|---|---|
| Landing | `/` | Public | - |
| Login | `/login` | Public | 01 |
| Sign up: role choice | `/signup` | Public | 01 |
| Sign up form | `/signup/investor`, `/signup/seller` | Public | 01 |
| Dashboard | `/app` (content by role) | Both | 01, 03 |
| Market | `/app/market`, `/app/market/:listingId` | Both (buy = investor) | 03 |
| Smart Match | `/app/match` | Investor | 04 |
| Checkout | `/app/checkout/:listingId` (steps: quantity → review → done) | Investor | 05, 02 |
| Portfolio | `/app/portfolio` | Investor | 08-A |
| Transactions | `/app/transactions` | Both | 08 |
| Premium | `/app/premium`, `/app/insights` | Investor | 07 |
| My listings | `/app/listings`, `/app/listings/new`, `/app/listings/:id` | Seller | 06 |
| Sales log | `/app/sales` | Seller | 08-B |
| Settings | `/app/settings` | Both | - |

Every route is deep-linkable. Browser back always works (no state lost on back from review to quantity).

### 2.2 Navigation per role
| Investor (sidebar / mobile tab bar) | Seller (sidebar / mobile tab bar) |
|---|---|
| لوحة التحكم `SquaresFour` | لوحة التحكم `SquaresFour` |
| السوق `Storefront` | عروضي `Tag` |
| المطابقة الذكية `Target` | إضافة عرض `Plus` (tab bar center) |
| محفظتي `Wallet` | سجل المبيعات `Receipt` |
| المزيد (mobile) → سجل العمليات، رؤى Premium، الإعدادات | المزيد (mobile) → السوق، الإعدادات |

Desktop sidebar adds: سجل العمليات، رؤى Premium (investor), الإعدادات, account block at the bottom (name, role badge, verification status).

Topbar (all app pages): page title, **live price chip** (24K), notifications, account menu, theme and language toggles in the account menu.

---

## 3. Global Patterns

### 3.1 Live price freshness
- Prices come from a cache refreshed about every minute (workflow 03). The UI polls `GET /api/market/prices` every 30s and on window focus.
- Freshness label: `آخر تحديث قبل 12 ثانية` (relative, updates every 10s).
- Stale (> 90s) or API failure: keep last value, label turns warning: `[Warning] آخر سعر متاح · 14:32` and a tooltip explains. Never blank, never zero.

### 3.2 Error code → UI mapping (single source)
| Code / status | Where | UI response |
|---|---|---|
| `401 Unauthorized` | Any | Silent `POST /api/auth/refresh`; if it fails: login sheet over the current page ("انتهت الجلسة، سجّل الدخول للمتابعة"), then resume the same action with inputs intact |
| `409 Conflict` (signup) | Signup email | Inline under email: `هذا البريد مسجّل مسبقاً.` + link `تسجيل الدخول` |
| Validation (Pydantic) | Forms | Inline under the field, first invalid field receives focus |
| Rate limit (login) | Login | Inline banner: `محاولات كثيرة. حاول مجدداً بعد 5 دقائق.` with countdown, button disabled |
| `KYC_NOT_VERIFIED` (403) | Confirm purchase / publish listing | Open KYC sheet (flow 02). Preserve the pending action |
| `INSUFFICIENT_AVAILABLE_WEIGHT` | Confirm | Inline in order summary: new available weight + `عدّل الكمية` |
| `LISTING_NOT_ACTIVE` | Confirm | Full-step notice: `هذا العرض لم يعد متاحاً (نفد أو عُلِّق).` + `عروض مشابهة` + `العودة إلى السوق` |
| `SUBSCRIPTION_REQUIRED` | Insights | Locked insights state with the Premium offer (flow 07) |
| `INTEGRITY_CHECK_FAILED` | Portfolio | Balance hidden; danger notice + support contact; logged server-side |
| AI provider failure | Match / risk | Friendly unavailable state + manual alternative; checkout continues without AI line |
| Network / timeout on confirm | Confirm | Never auto-retry. Show `لم نتمكّن من التأكد من حالة العملية. راجِع سجل العمليات قبل المحاولة مجدداً.` + link to transactions |

### 3.3 Loading, empty, error (every data view has all three)
- Loading: skeleton of the exact layout (04-layout 8.3). AI calls: thinking squares + honest line (`نحلّل ميزانيتك مع أسعار اليوم…`).
- Empty: icon tile + one sentence + one action.
- Error: what happened + what to do + retry.

### 3.4 Money action safety
- Double submit protection: button disabled + `aria-busy` from click until response.
- Client-side idempotency key per confirm attempt (header), so a retried request is recognized.
- Every money screen shows a `LockSimple` secure note: `عملية محمية: تُنفَّذ كاملة أو لا تُنفَّذ إطلاقاً.` (reflects the atomic DB transaction).

### 3.5 Preserved intent (interrupt & resume)
A small store (`pendingAction`) keeps `{ type, payload, returnTo }` in memory and `sessionStorage` (wrapped in try/catch). Used by: token expiry, KYC interruption, login-from-landing. After resolution the user lands on the exact step with fields filled and the primary button focused.

### 3.6 Toasts vs inline
Inline for anything about a form or a money step. Toasts only for transient confirmations (`تم نسخ الرمز`, `تم تفعيل الترويج`).

---

## 4. Flow 01 · Onboarding

### Screen 1.1 · Role choice `/signup`
- Layout T4 (golden split). Brand panel: logo White, one line `سوق الذهب بسعره الحقيقي`, three trust points with icons (`Broadcast` أسعار حية، `ShieldCheck` تنفيذ آمن، `Signature` ملكية موثّقة).
- Form column: title `كيف ستستخدم صِلة؟`
- Two selectable option cards, fixed height 220, side by side (stacked on mobile):
  - `Wallet` **مستثمر**: `اشترِ الذهب بحسب ميزانيتك، بمساعدة المطابقة الذكية.`
  - `Storefront` **بائع**: `اعرض ذهبك لجمهور موثوق بسعر عادل وموحّد.`
- Selected card: 1.5px selected border + icon regular → fill.
- Note under cards (body-sm, tertiary, `Info`): `نوع الحساب ثابت بعد التسجيل. لاستخدام الدورين أنشئ حساباً آخر ببريد مختلف.`
- Primary button `متابعة` (lg, disabled until a role is chosen). Link `لديك حساب؟ سجّل الدخول`.

### Screen 1.2 · Sign up form
Fields (labels above, 48px):
| Field | Investor | Seller | Rules |
|---|---|---|---|
| الاسم الكامل `full_name` | yes | yes | required |
| البريد الإلكتروني `email` | yes | yes | LTR, format check on blur |
| كلمة المرور `password` | yes | yes | LTR, show/hide, min 8, strength hint below: `8 أحرف على الأقل` turns into `CheckCircle` when met |
| الملف الاستثماري `risk_profile` | yes | no | 3 option cards (136 high): **منخفض** `أولويتي حماية رأس المال` · **متوسط** `توازن بين الأمان والفرصة` · **مرتفع** `أتقبّل التذبذب مقابل فرص أكبر` |

- Helper under risk profile: `يستخدمه محرك المطابقة الذكية لاقتراح العروض المناسبة لك.`
- Button `إنشاء الحساب` (Accent, xl on mobile). On submit: loading state; `409` → inline on email.
- Legal line (body-sm): terms and privacy links.

### Screen 1.3 · Login `/login`
- Email + password + `تسجيل الدخول` (Accent). Link `إنشاء حساب`.
- Wrong credentials: one generic message (security): `البريد الإلكتروني أو كلمة المرور غير صحيحة.`
- Rate limit: see 3.2.

### Screen 1.4 · First dashboard
- **Investor**: T1 layout. Live Price Panel (focal) + Smart Match quick panel with the budget field and `ابدأ المطابقة` (Accent). KPI row shows `0.000 غ` with helper `ابدأ أول استثمار`. A dismissible **"ابدأ من هنا"** card (220 high) with three short checks: `تعرّف على الأسعار الحية` · `جرّب المطابقة الذكية` · `أتمم أول عملية شراء` (items check themselves as the user does them).
- **Seller**: empty dashboard state, fixed-size hero empty card: `Tag` tile + `لا توجد عروض بعد.` + `أضف عرضك الأول` (Accent) + a secondary line with the current reference price for 21K so the seller sees what they will get.
- Account menu shows a neutral status: `التوثيق: سيُطلب عند أول عملية شراء` (investor) / `عند نشر أول عرض` (seller). No nagging banners.

---

## 5. Flow 02 · KYC Verification (mock "توقيعك")

Trigger only at the sensitive action (confirm purchase / publish first listing), per workflow 02.

### Sheet 2.1 · Why & consent (dialog md 576 / mobile sheet)
- Header band `--surface-brand` with Sila icon White 24 + title `وثّق هويتك لإتمام العملية`.
- Body: three short rows with icons:
  - `IdentificationCard` `نتحقق من هويتك مرة واحدة فقط.`
  - `ShieldCheck` `يحمي التوثيق حقوقك كمشترٍ وبائع قانونياً.`
  - `Hourglass` `يستغرق عادةً أقل من دقيقة.`
- MVP honesty label (badge, info): `نسخة تجريبية: محاكاة للربط مع منصة توقيعك`. The government platform is named in text only; no official logos or look-alike branding.
- Actions: `متابعة التوثيق` (Primary), `لاحقاً` (ghost).

### Sheet 2.2 · Verifying
- Stepper with 3 segments: `إرسال الطلب` → `مطابقة البيانات` → `اعتماد الهوية`. Segments fill as `POST /api/kyc/verify` (investor) or `/api/kyc/seller` (seller) resolves.
- Copy: `نتحقق من هويتك بأمان…`. No fake long delays: show real progress; minimum display time 890ms so the step is readable.

### Sheet 2.3 · Verified
- `SealCheck` regular → fill, title `تم توثيق هويتك`, line `لن نطلب التوثيق مجدداً.`
- **Investor**: button `العودة إلى مراجعة الشراء` returns to the Review step with all data intact and the confirm button focused. The user taps confirm again (money is never auto-executed).
- **Seller**: the listing is published automatically with the same data (workflow 06), toast `تم نشر عرضك`, user lands on the listing page.

### Cancel / failure
- Cancel: back to the previous step; inline info in the summary: `الشراء معلّق حتى إكمال التوثيق.` with `وثّق الآن`.
- Token expired during KYC: login sheet, then back to the KYC sheet.

---

## 6. Flow 03 · Market Browsing

### Screen 3.1 · Dashboard price area
Live Price Panel (06-style 6.1): 24K reference, derived 22/21/18 prices (`GlobalPrice24k × Karat/24`), USD/IQD rate, freshness label, range tabs.

### Screen 3.2 · Market `/app/market`
- Sticky filter bar (64): karat segmented `الكل · 24 · 22 · 21 · 18`, price range (two inputs `من` / `إلى` in IQD per gram, with a compact range slider on desktop), clear-filters link. Sort label shows `المروّجة أولاً` (default, per API).
- Filters sync to the URL (`?karat=21&min_price=...`), so back/share works.
- Grid of fixed 356 listing cards (04-layout 8.2). Promoted cards: `Megaphone` badge + gold border (no gold fill).
- Card shows: karat chip, title, seller (anonymized id if no name) with verified seal, 24h sparkline of the karat price, `سعر مرجعي للغرام`, available grams, buttons `التفاصيل` + `اشترِ` (investor only; sellers see `التفاصيل` only).
- Reference price hint (tooltip on the label): `سعر مرجعي. يُحسب السعر النهائي لحظة الشراء وفق السعر الحي.`
- Empty filter result: `لا توجد عروض تطابق بحثك.` + `مسح الفلاتر` + `جرّب المطابقة الذكية`.
- Pagination: "load more" button (not infinite scroll) so the footer and position stay predictable.

### Screen 3.3 · Listing detail `/app/market/:id`
- T3 golden split. Main: title, karat, seller block, price chart for that karat (576), available/total weight, listing status, promoted state.
- Aside (sticky): live price per gram for this karat, quick grams input, estimated total (`تقديري`), `اشترِ` (Accent) → checkout with the listing and grams prefilled.

---

## 7. Flow 04 · AI Smart Matching `/app/match`

### Screen 4.1 · Budget
- Centered focus layout inside the golden grid (form column 576).
- Title `كم تريد أن تستثمر؟`
- XL budget field (64 high, IQD, live thousands separators), quick chips `500,000` · `1,000,000` · `5,000,000` · `10,000,000`.
- Read-only line: `ملفك الاستثماري: متوسط` with `Info` tooltip (risk profile is taken from the account server-side; user does not re-enter it).
- Button `ابدأ المطابقة` (Accent). Secondary link `أفضّل التصفح بنفسي` → market.

### Screen 4.2 · Thinking
- Same page, results area shows 3 skeleton result cards + thinking squares + `نقرأ أسعار اليوم ونطابقها مع ميزانيتك…`.

### Screen 4.3 · Results
- Ranked list (1st is visually emphasized with the selected border, not with gold). Each result card: listing essentials + **AI reason line** (`Sparkle` + text from API) + `اشترِ هذا العرض` → checkout with `asset_id` prefilled.
- Header summary: `وجدنا 4 عروض تناسب 1,000,000 د.ع` + `تعديل الميزانية`.
- Disclosure line (body-sm): `اقتراحات مساعدة وليست نصيحة مالية. القرار لك.`

### Edge states
- Budget below cheapest listing: `ميزانيتك أقل من أرخص عرض متاح حالياً (98,450 د.ع للغرام).` + chip to set the minimum + market link.
- AI unavailable: `المطابقة الذكية غير متاحة مؤقتاً.` + `تصفح السوق` (Primary).

---

## 8. Flow 05 · Checkout & Purchase `/app/checkout/:listingId`

The most sensitive flow. Three visible steps in a Sila Cut stepper: **الكمية → المراجعة → التأكيد**.

### Step 5.1 · Quantity
- T3 layout: main shows listing summary (karat, seller, available weight); aside is the order panel.
- Grams input (48, LTR, `غ` suffix) + chips `5 غ` · `10 غ` · `25 غ` · `50 غ` · `الكمية كاملة`.
- Instant client validation: `> 0` and `<= AvailableWeightGrams`. Message: `الحد الأقصى المتاح 84.250 غ.`
- Live estimate in the panel labelled `تقديري`, using the public tier table.
- **Tier nudge** (transparent, not pushy): when the user is within 10 g of the next tier: `عند 50 غ تنخفض العمولة إلى 1.0%.` (info style, no gold).
- Button `مراجعة الطلب` (Primary) → calls `POST /api/transactions/preview` and in parallel `POST /api/ai/risk-analysis`.

### Step 5.2 · Review (the confirmation screen)
Order summary (06-style 6.4), all values from the preview response:
- Quantity, execution price per gram (with karat), principal, commission (rate + amount), **total** as the focal figure.
- AI Risk Insight line (or the "unavailable" line; it never blocks).
- Price timestamp: `السعر محسوب قبل 8 ثوانٍ`. If the preview is older than 60s, or the price cache changed (detected by polling), the confirm button is replaced by `حدّث المعاينة` with the note `تغيّر السعر منذ المعاينة.` This keeps what the user sees equal to what they pay.
- Secure note (3.4).
- Buttons: `أكّد الشراء · 1,249,084 د.ع` (Accent, xl, full width in the aside) and `تعديل الكمية` (ghost).

### Step 5.3 · Confirm
- `POST /api/transactions/confirm`, button in loading state, copy `جارٍ تنفيذ العملية بأمان…`, page not dismissible during the request (back is intercepted with a gentle dialog).
- `KYC_NOT_VERIFIED` → flow 02, then back to Review.
- `INSUFFICIENT_AVAILABLE_WEIGHT` / `LISTING_NOT_ACTIVE` / network: see 3.2.

### Step 5.4 · Success (receipt)
- Checkmark draw + `تمت عملية الشراء بنجاح`.
- Receipt card: grams bought, karat, execution price, commission, total paid, date/time, transaction reference (copyable).
- Focal: **new verified balance** `رصيدك الآن 37.750 غ` with `SealCheck` `موثّق رقمياً`.
- Actions: `عرض محفظتي` (Primary) · `متابعة التسوق` (ghost). Optional: `تحميل الإيصال` (PDF, later).
- No confetti, no sound.

---

## 9. Flow 06 · Seller Listing

### Screen 6.1 · New listing `/app/listings/new`
- T3 split: form (main) + **live card preview** (aside, the real 356 listing card updating as the seller types).
- Fields: `الوزن الكلي (غ)` `total_weight_grams`, `العيار` segmented `24 · 22 · 21 · 18`.
- Reference price block (read-only, auto): `السعر المرجعي للغرام: 98,450 د.ع` + explanation `تحدد صِلة السعر تلقائياً وفق السعر العالمي والعيار، لضمان تسعير عادل وموحّد للجميع.` + formula disclosure `سعر عيار 24 × (العيار ÷ 24)`.
- Estimated listing value (tertiary): weight × reference price.
- Button `نشر العرض` (Accent). First publish without KYC → flow 02 (seller variant) → auto-publish.

### Screen 6.2 · My listings `/app/listings`
- Table (desktop) / cards (mobile): title, karat, available / total (e.g. `62.000 / 100.000 غ`), status badge (`نشط`، `معلّق`، `نفد`), promotion time left (`مروَّج · متبقٍ 3 أيام`), actions menu.
- Actions: `روّج العرض`, `تعليق العرض` / `إعادة التفعيل`. There is **no delete**; the menu shows a disabled item with tooltip `لا يمكن حذف العروض للحفاظ على سجل العمليات. يمكنك تعليقها.`
- Suspend confirmation (dialog sm): `سيختفي العرض من السوق حتى تعيد تفعيله.` → `تعليق العرض` (Danger) / `إلغاء`.

### Dialog 6.3 · Promote
- Fixed fee (server config), duration, what it does (`يظهر عرضك أولاً في نتائج السوق`), badge `دفع تجريبي`.
- `ادفع وفعّل · 25,000 د.ع` (Accent). Success: toast + badge on the listing + time left. Failure: inline error, listing unchanged.

---

## 10. Flow 07 · Premium Subscription

### Screen 7.1 · Offer `/app/premium`
- Hero card (356): `Crown` + `رؤى Premium`, monthly price, three benefits with icons: `Bell` تنبيهات ذكية، `TrendUp` تحليل اتجاه السوق، `ChartLineUp` تقرير أداء المحفظة.
- Clear statement: `المطابقة الذكية مجانية دائماً.` (so free users never feel locked out of the core).
- Button `اشترك الآن` (Accent).

### Dialog 7.2 · Subscribe (mock payment)
- Summary: price, period 30 days, start/end dates calculated exactly like the server:
  - Not active: `من اليوم حتى 23 تشرين الأول 2026`.
  - Active (early renewal): `سيُضاف 30 يوماً إلى تاريخ انتهائك الحالي: من 5 تشرين الثاني إلى 5 كانون الأول 2026.`
- Badge `دفع تجريبي`. Button `تأكيد الاشتراك`.

### Screen 7.3 · Insights `/app/insights`
- Active: alerts list, trend analysis panel (chart), portfolio performance report.
- `SUBSCRIPTION_REQUIRED`: a locked state that shows the **structure** (empty panels with lock tiles and titles), not blurred real data, plus the offer card. Copy: `هذه الرؤى متاحة لمشتركي Premium.`
- Expiry awareness (client-side from `subscription_expiry_date`): 3 days before, a quiet info line in portfolio: `ينتهي اشتراكك في 23 تشرين الأول.` + `تجديد`.

---

## 11. Flow 08 · Ownership & Portfolio

### Screen 8.1 · Investor portfolio `/app/portfolio` (T5)
- **Holdings hero** (focal): `total_accumulated_grams` as `h1`-size figure, estimated current value in IQD (grams × live price, labelled `القيمة التقديرية الآن`), and today's change.
- **Signature card**: `رصيد موثّق رقمياً` + short hash + `تم التحقق` seal + a one-line plain explanation on hover/tap: `نتحقق من توقيع رقمي لرصيدك في كل مرة تفتح فيها المحفظة، لضمان عدم التلاعب به.`
- Allocation by karat (horizontal stacked bar or donut, direct labels) + value over time chart.
- Transactions table: date, karat, grams, execution price, commission, total paid. Row → receipt sheet. Footer note: `سجل العمليات دائم ولا يُحذف.`
- Subscription summary card (active until / upgrade).
- Empty (no purchase yet): `0.000 غ` + `ابدأ أول استثمار` → market.
- `INTEGRITY_CHECK_FAILED`: holdings hero replaced by danger notice: `تعذّر التحقق من رصيدك.` + `حفاظاً على أمانك لن نعرض الرصيد حتى تتم مراجعته. تواصل مع الدعم.` + support action. No numbers shown.

### Screen 8.2 · Seller sales `/app/sales`
- KPI row: total grams sold, total received (principal, `بدون خصم عمولة`), active listings, promoted listings.
- Sales table: date, buyer (anonymized), listing, grams, `المبلغ المستلم`.
- Listings summary with remaining weight and status, link to My listings.

---

## 12. Landing Page UX `/` (dark theme only)

Purpose: explain Sila in one scroll, prove transparency with live data, move visitors to sign up by role.

| # | Section | Layout family | Content & behavior | CTA |
|---|---|---|---|---|
| 1 | Nav (72) | Bar | Logo White 32, links: `كيف تعمل` · `الأسعار` · `الأمان` · `للبائعين` · `الأسئلة`, `تسجيل الدخول` (ghost). Translucent navy on scroll | `افتح حسابك` (Primary mist, not gold) |
| 2 | Hero | Golden split | Headline ≤ 2 lines: `الذهب بسعره الحقيقي، لحظة بلحظة.` Sub ≤ 20 words: `سوق ذهب رقمي في العراق بأسعار حية، ومطابقة ذكية لميزانيتك، وملكية موثّقة رقمياً.` End column: the **real Live Price card** (live API, chart draws, digits roll). Navy wash background (the only gradient) | `افتح حسابك` (Accent) + `كيف تعمل صِلة` (ghost, scrolls to 4) |
| 3 | Market strip | Marquee (the only one) | 24K · 22K · 21K · 18K per gram, USD/IQD, freshness. Pauses on hover/focus | - |
| 4 | How it works | **Pinned scroll-driven walkthrough** (GSAP) | Device frame with the real dashboard components (demo data). 5 steps named by verbs: `تابع الأسعار الحية` → `دع المطابقة تقترح` → `راجِع كل رقم` → `وثّق مرة واحدة` → `امتلك ذهباً موثّقاً`. Progress rail of 5 Sila Cut segments. Each step: 1 title + 1 line (≤ 18 words) | - |
| 5 | Transparent pricing | Golden split (reversed) | Interactive calculator: karat + grams → price per gram, principal, commission tier, total (same formula as the server). Gold bars stack with grams. Tier table `< 50 غ 1.5%` · `50 إلى 200 غ 1.0%` · `> 200 غ 0.5%` | - |
| 6 | Security layers | **Horizontal pinned pan** (the only one) | 5 panels (576×576): `تسعير موحّد` (formula) · `هوية موثّقة` (KYC) · `تنفيذ ذرّي` (all-or-nothing, protects against simultaneous purchases) · `ملكية بتوقيع رقمي` (HMAC seal visual) · `سجل لا يُحذف`. Each: icon tile with Sila Cut, headline, 2 lines, one mini visual | - |
| 7 | Brand statement | Four-around-one | Logo icon assembles on scroll (tonal navy/blue), one line: `صِلة بينك وبين ذهبك، بشفافية كاملة.` | - |
| 8 | For sellers | Split with live card | The real listing card preview + 3 facts (سعر عادل تلقائي، جمهور موثّق، ترويج عند الحاجة) | `سجّل كبائع` (secondary) |
| 9 | Premium | Bento, exactly 3 cells | Alerts, trend analysis, portfolio report (each with a real mini chart/visual). Free Smart Match statement | - |
| 10 | FAQ | Accordion (max 932) | 6 questions: how is the price set, what is the commission, is KYC required, is my balance safe, can sellers set prices, what is Premium | - |
| 11 | Final CTA + footer | CTA band (navy wash) + footer | One line + `افتح حسابك` (Accent). Footer: logo White 40, links, legal, contact | |

Rules: one gold button per viewport; `افتح حسابك` is the single sign-up label everywhere; max 4 eyebrows on the page; every section on mobile has an explicit stacked layout (walkthrough unpinned, horizontal section becomes a swipe carousel).

---

## 13. Accessibility & Comfort (audience 30 to 60)

- Body 16px (app) / 20px (landing), inputs 16px, min 14px Arabic.
- Controls 48px, targets ≥ 44px, 8px gaps.
- WCAG AA minimum everywhere (01-color section 9), focus ring always visible on keyboard.
- Full keyboard path through checkout; logical focus order in RTL.
- Screen reader: labelled icons, live price announced politely (throttled), errors linked with `aria-describedby`.
- No session timeouts during an open review step without warning (warn at 2 minutes left with `تمديد الجلسة`).
- Works at 200% zoom without horizontal scroll (except the landing's pinned horizontal section, which falls back to the swipe carousel when zoomed/narrow).

---

## 14. UX Acceptance Checklist

- [ ] Every workflow 01 to 08 maps to screens above with loading, empty and error states.
- [ ] Every error code has a designed response (3.2).
- [ ] Fees and total shown before confirm; confirm label includes the total.
- [ ] KYC interrupts resume at the same step with data intact; purchase never auto-executes.
- [ ] Preview price freshness enforced (refresh required after 60s or price change).
- [ ] AI outputs have reasons and a manual alternative.
- [ ] No delete for listings; suspend explained.
- [ ] Integrity failure never shows a number.
- [ ] Mock payments and mock KYC are labelled as simulations.
