# Workflow 09: Investor Resale (إعادة بيع المستثمر)

**الفاعلون:** Investor (صاحب الرصيد) و Investor ثاني (المشتري).
**المحفّز:** المستثمر يضغط "اعرض للبيع" من محفظته (`08-ownership-portfolio.md`).
**الشروط المسبقة:** تسجيل دخول كمستثمر، موثّق (`KycVerified`)، وعنده رصيد موثّق (التحقق من التوقيع ينجح).

> صِلة تبقى **وسيط** وما تشتري الذهب بنفسها. إعادة البيع عرض بالسوق مثل عروض البائعين، والمشتري مستثمر ثاني.
> المستثمر **ما يتحول لبائع**: دوره يبقى `Investor`.

---

## أ. إنشاء عرض إعادة بيع

### 1. اختيار الكمية
- المحفظة تعرض لكل عيار: المملوك (`HoldingsByKarat`)، والمحجوز بعروض سابقة، و**المتاح لإعادة البيع** (`AvailableToResell`).
- المستثمر يختار العيار والكمية (`> 0` و`<= AvailableToResell` لذاك العيار).

### 2. السعر
- سيرفرياً: `base_price_per_gram = آخر سعر لحظي عيار 24 × (karat / 24)`، نفس عروض البائعين. المستثمر ما يحدد سعره.
- عند الشراء، السعر الفعلي يُحسب لحظياً مثل أي عرض (`05-checkout-purchase.md`).

### 3. النشر
- **Endpoint:** `POST /api/ownership/resale` (مستثمر، موثّق) مع `Idempotency-Key`.
- السيرفر بـ DB Transaction واحدة:
  1. يتحقق من توقيع سجل الملكية (`INTEGRITY_CHECK_FAILED` إذا فشل).
  2. يعيد حساب `AvailableToResell(Karat)` تحت قفل (Row Lock على سجل الملكية) ويرفض إذا الكمية أكبر (`INSUFFICIENT_HOLDINGS`).
  3. ينشئ `AssetListing` بنوع `InvestorResale`، و`seller_id = investor_id`، و`available_weight_grams = total_weight_grams`، و`status = Active`.
- الكمية صارت **محجوزة**: ما تدخل بعرض ثاني، بس تبقى جزء من `TotalAccumulatedGrams` (والتوقيع ما يتغير) لحد ما تنباع.
- العرض يظهر فوراً بالسوق، بالمطابقة الذكية، وبالمستشار، بعلامة "إعادة بيع من مستثمر" وبدون اسم المستثمر.

---

## ب. الشراء من عرض إعادة بيع

نفس `05-checkout-purchase.md` بالضبط (Preview، سعر مثبّت، Confirm، نفس العمولة على المشتري)، ويضاف للتنفيذ الذري:
- المشتري ما يكون صاحب العرض (`FORBIDDEN`).
- قفل وتحقق من توقيع سجل المستثمر البائع.
- `total_accumulated_grams` للبائع `-= purchased_weight_grams` وإعادة توقيعه، وللمشتري `+=` وإعادة توقيعه، بنفس الـ DB Transaction. أي فشل يرجّع الكل.
- المستثمر البائع يستلم `principal_amount` كامل (دفع وهمي)، والعمولة من المشتري فقط.
- إذا وصلت `available_weight_grams` للصفر → `SoldOut`.

---

## ج. سحب العرض

- **Endpoint:** `PATCH /api/ownership/resale/{id}` بـ `{status: "withdrawn"}` (صاحب العرض فقط).
- `status = Withdrawn` (نهائية)، والكمية غير المباعة ترجع لـ `AvailableToResell` تلقائياً (لأنها ما تنحسب محجوزة بعد).
- إيقاف مؤقت (`Suspended`) مسموح أيضاً، والكمية تبقى محجوزة.

---

## بعد إتمام هذا الـ Workflow
- عرض إعادة بيع ظاهر بالسوق، أو مسحوب ورجعت كميته.
- عند كل شراء: `Transaction` جديد، والسجلين انعاد توقيعهم، والمحفظتين تعرض الرصيد الجديد.
- سجل صفقات المستثمر البائع يعرض الصفقة كـ "بيع".

## حالات الخطأ
| الحالة | error_code | السلوك |
|---|---|---|
| غير موثّق | `KYC_NOT_VERIFIED` | توجيه لـ Workflow 02 ثم يكمل تلقائياً |
| الكمية أكبر من المتاح لإعادة البيع | `INSUFFICIENT_HOLDINGS` | رفض، ويعرض المتاح |
| فشل التحقق من التوقيع | `INTEGRITY_CHECK_FAILED` | رفض + حادثة أمنية |
| المستثمر يحاول يشتري عرضه | `FORBIDDEN` | رفض |
| سحب عرض مو مالته أو منتهي | `FORBIDDEN` / `INVALID_STATUS_TRANSITION` | رفض |

## Entities المرتبطة
`AssetListing` (إنشاء/تحديث، نوع `InvestorResale`) · `FractionalOwnershipRecord` (تحقق، ونقل الرصيد عند الشراء) · `Transaction` (إنشاء، وقراءة لحساب الرصيد حسب العيار)

## Endpoints المرتبطة
`GET /api/ownership/me` (يرجع الرصيد حسب العيار والمحجوز) · `POST /api/ownership/resale` · `PATCH /api/ownership/resale/{id}` · `POST /api/transactions/preview` · `POST /api/transactions/confirm`
