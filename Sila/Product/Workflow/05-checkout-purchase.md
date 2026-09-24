# Workflow 05: Checkout & Purchase (عملية الشراء)

**الفاعلون:** Investor.
**المحفّز:** المستثمر يضغط "اشتري" على عرض معين (من `03-market-browsing.md` أو `04-ai-smart-matching.md`).
**الشروط المسبقة:** تسجيل دخول. **KYC غير مطلوب لحد هذي اللحظة** — يُفحص فقط عند خطوة التأكيد الفعلية (الخطوة 4).

> هذا أهم Workflow بالمنصة أمنياً وتقنياً — فيه كل الحسابات المالية وأول نقطة خطر Race Condition بالنظام كامل.

---

## الخطوات بالتفصيل

### 1. تحديد الكمية
- المستثمر يدخل `purchased_weight_grams` اللي يريد يشتريه من العرض المختار.
- Validation فوري بالـ Frontend: القيمة لازم تكون `> 0` و`<= AvailableWeightGrams` الظاهرة (تحقق نهائي حقيقي يصير سيرفرياً بالخطوة 4).

### 2. طلب المعاينة (Preview)
- **Endpoint:** `POST /api/transactions/preview`
- Body: `{ "asset_id": ..., "purchased_weight_grams": ... }`
- السيرفر يحسب:
  ```
  execution_price_per_gram = آخر سعر لحظي × (Karat / 24)
  principal_amount         = purchased_weight_grams × execution_price_per_gram
  commission_rate          = حسب Tier (راجع الجدول تحت)
  commission_amount        = principal_amount × commission_rate
  total_paid_by_investor   = principal_amount + commission_amount
  ```
  | حجم الصفقة | commission_rate |
  |---|---|
  | < 50 غرام | 1.5% |
  | 50–200 غرام | 1.0% |
  | > 200 غرام | 0.5% |
- **بالتوازي:** نداء `POST /api/ai/risk-analysis` → يرجع رسالة قصيرة (مثلاً: "السعر الحالي منخفض مقارنة بأمس، فرصة شراء جيدة").
- هذا الـ Endpoint **قراءة فقط** — ما يخصم ولا يحجز أي كمية، بس عرض أرقام.

### 3. شاشة التأكيد النهائية
تُعرض للمستثمر:
- الكمية وقيمتها الصافية (`principal_amount`).
- رسوم العمولة بوضوح (`commission_amount`, والنسبة المطبقة).
- المبلغ الكلي (`total_paid_by_investor`).
- AI Risk Insight من الخطوة السابقة.
- زر "تأكيد العملية".

### 4. التنفيذ الفعلي (Confirm)
- **Endpoint:** `POST /api/transactions/confirm`
- **الفحص الأول (سيرفري إجباري):** `KycVerified == true`؟
  - إذا `false` → يوقف كل شي ويوجه لـ `02-kyc-verification.md` (قسم أ) — بعد التوثيق يرجع تلقائياً لنفس هذي الخطوة بنفس البيانات.
- **الفحص الثاني:** العرض بحالة `Active` وما تغيرت قيمة `AvailableWeightGrams` بشكل يخلي الطلب غير صالح.
- **التنفيذ (DB Transaction واحدة Atomic، مع Row-Level Lock — `SELECT ... FOR UPDATE` على صف الـ `AssetListing`):**
  1. إعادة التحقق: `purchased_weight_grams <= AvailableWeightGrams` (تحقق أخير لحظة التنفيذ، يمنع Race Condition لو مستثمر ثاني اشترى بنفس اللحظة).
  2. خصم الكمية: `AvailableWeightGrams -= purchased_weight_grams`.
  3. إذا وصلت `AvailableWeightGrams` للصفر → `Status = SoldOut` تلقائياً.
  4. إنشاء سجل `Transaction` جديد بكل القيم المحسوبة بالخطوة 2.
  5. تحديث (أو إنشاء لو أول عملية) `FractionalOwnershipRecord`:
     - `total_accumulated_grams += purchased_weight_grams`
     - توليد `digital_signature_token` جديد = HMAC-SHA256(`investor_id + total_accumulated_grams + timestamp`) بمفتاح سري سيرفري.
  6. الـ DB Transaction تُثبَّت (Commit) دفعة وحدة — لو أي خطوة فشلت، الكل يترجع (Rollback) بدون أي تغيير جزئي.

### 5. شاشة النجاح
تعرض للمستثمر تأكيد الشراء + رصيده الجديد من الذهب (`total_accumulated_grams`) → رابط لـ `08-ownership-portfolio.md`.

---

## بعد إتمام هذا الـ Workflow
- `Transaction` جديد مسجل (Audit trail دائم — ما ينحذف أبداً).
- `FractionalOwnershipRecord` محدّث بتوقيع رقمي جديد.
- `AssetListing.AvailableWeightGrams` محدّث (وربما `Status = SoldOut`).
- البائع يستلم `principal_amount` كامل بدون خصم (العمولة مصدرها المستثمر فقط).

## حالات الخطأ
| الحالة | error_code | السلوك |
|---|---|---|
| KYC غير موثق | `KYC_NOT_VERIFIED` | توقف + توجيه لـ Workflow 02 |
| الكمية المطلوبة أكبر من المتاح فعلياً (تغيرت بين Preview وConfirm) | `INSUFFICIENT_AVAILABLE_WEIGHT` | رفض العملية، رسالة "الكمية تغيرت، حدّث الصفحة" |
| العرض تحول لـ `SoldOut` أو `Suspended` بين الخطوتين | `LISTING_NOT_ACTIVE` | رفض العملية |
| فشل نداء AI Risk Analysis | لا يوقف العملية — تُعرض الشاشة بدون رسالة AI، مع ملاحظة "التحليل الذكي غير متاح حالياً" |

## Entities المرتبطة
`AssetListing` (تحديث) · `Transaction` (إنشاء) · `FractionalOwnershipRecord` (تحديث/إنشاء) · `User.kyc_verified` (قراءة)

## Endpoints المرتبطة
`POST /api/transactions/preview` · `POST /api/ai/risk-analysis` · `POST /api/transactions/confirm`
