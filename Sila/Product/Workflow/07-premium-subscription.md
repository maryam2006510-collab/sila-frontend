# Workflow 07: Premium Subscription (الاشتراك المميز)

**الفاعلون:** Investor.
**المحفّز:** المستثمر يضغط "ترقّى لـ Premium" (من لوحته أو من رسالة "هذه الميزة تتطلب اشتراك" عند محاولة فتح AI Insights).
**الشروط المسبقة:** تسجيل دخول كمستثمر — **لا يحتاج KYC** (الاشتراك مو عملية شراء ذهب).

---

## الخطوات بالتفصيل

### 1. عرض تفاصيل الاشتراك
- يُعرض: السعر الشهري (Config Value ثابت)، ووصف مزايا Premium (تنبيهات ذكية، تحليل اتجاه السوق، تقارير أداء المحفظة).

### 2. الاشتراك
- **Endpoint:** `POST /api/subscription/subscribe`
- السيرفر ينادي داخلياً `POST /api/payments/mock` (دفع وهمي، نفس آلية ترويج العروض بـ `06-seller-listing.md`).
- بعد نجاح الدفع:
  - لو `subscription_expiry_date` منتهي أو غير موجود → يبدأ من `now()` + 30 يوم.
  - لو الاشتراك ساري حالياً (تجديد مبكر) → يُمدَّد من تاريخ الانتهاء الحالي + 30 يوم (مو من `now()`، حتى ما يخسر المستثمر أيام مدفوعة).
  - `subscription_tier = 'premium'`.

### 3. الوصول لميزات Premium
- **Endpoint:** `GET /api/ai/insights`
- كل نداء يفحص سيرفرياً: `subscription_expiry_date > now()`؟
  - نعم → يرجع التنبيهات + تحليل الاتجاه + تقرير أداء المحفظة (مبني على بيانات `08-ownership-portfolio.md`).
  - لا → `403 Forbidden`, `error_code: SUBSCRIPTION_REQUIRED`، حتى لو `subscription_tier` بقيمة قديمة `'premium'` بالذاكرة — التاريخ هو الفيصل الحقيقي.

### 4. انتهاء الاشتراك (تلقائي)
- Background Job يومي يفحص كل حسابات المستثمرين: لو `subscription_expiry_date <= now()` → `subscription_tier` يرجع `'free'` تلقائياً (بدون أي Action من المستخدم).
- المستثمر يقدر يتابع استخدام Smart Matching المجاني (`04-ai-smart-matching.md`) بشكل طبيعي حتى لو انتهى اشتراكه.

---

## بعد إتمام هذا الـ Workflow
- `User.subscription_tier = 'premium'` و`subscription_expiry_date` محدّث لـ 30 يوم قدام.
- وصول كامل لـ `GET /api/ai/insights` طول فترة الاشتراك.

## حالات الخطأ
| الحالة | error_code | السلوك |
|---|---|---|
| محاولة فتح Insights بعد انتهاء الاشتراك | `SUBSCRIPTION_REQUIRED` | توجيه لصفحة التجديد (خطوة 1 من هذا الـ Workflow) |
| فشل الدفع الوهمي | — | `subscription_tier` يبقى بدون تغيير |

## Entities المرتبطة
`User.subscription_tier`, `User.subscription_expiry_date`

## Endpoints المرتبطة
`POST /api/subscription/subscribe` · `GET /api/subscription/status` · `GET /api/ai/insights` · `POST /api/payments/mock` (داخلي)
