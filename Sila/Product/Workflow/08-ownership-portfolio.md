# Workflow 08: Ownership & Portfolio (المحفظة وسجل الملكية)

**الفاعلون:** Investor (محفظته) و Seller (سجل مبيعاته) — كل وحدة بقسم منفصل تحت.
**المحفّز:** المستخدم يفتح "محفظتي" / "سجل عملياتي" من القائمة الجانبية — أي وقت بعد أول صفقة.
**الشروط المسبقة:** تسجيل دخول. هذا آخر محطة بالرحلة — المستخدم يرجعلها بشكل متكرر بعد كل عملية.

---

## أ. محفظة المستثمر (Investor Portfolio)

### 1. عرض الرصيد الموثّق
- **Endpoint:** `GET /api/ownership/me`
- **قبل** ما يرجع البيانات، السيرفر يعيد توليد `digital_signature_token` من القيم الحالية (`investor_id + total_accumulated_grams + آخر timestamp محفوظ`) ويقارنه بالمخزّن بقاعدة البيانات.
  - **تطابق** → يرجع `total_accumulated_grams` بثقة كاملة.
  - **عدم تطابق** → دليل على تلاعب مباشر بقاعدة البيانات (تغيير يدوي للرصيد بدون المرور بـ `05-checkout-purchase.md`) → السيرفر **يرفض إرجاع الرصيد** ويسجل حادثة أمنية (Audit Log)، `error_code: INTEGRITY_CHECK_FAILED`.

### 2. سجل الصفقات
- **Endpoint:** `GET /api/transactions` (يرجع صفقات المستثمر كمشتري فقط).
- كل صفقة تعرض: التاريخ، الكمية، `execution_price_per_gram`، `commission_amount`، `total_paid_by_investor`.

### 3. حالة الاشتراك
- نفس الصفحة تعرض ملخص من `GET /api/subscription/status` (Premium فعّال لين متى، أو زر "ترقّى" لو Free) — رابط مباشر لـ `07-premium-subscription.md`.

---

## ب. سجل مبيعات البائع (Seller Sales Log)

### 1. قائمة العروض النشطة وسجلها
- **Endpoint:** `GET /api/listings?seller_id=me` (أو المكافئ حسب الفلترة بحساب البائع الحالي).
- كل عرض يعرض: `AvailableWeightGrams` المتبقي، `Status`، هل مروّج حالياً (`is_promoted` + الوقت المتبقي).

### 2. سجل الصفقات (كبائع)
- **Endpoint:** `GET /api/transactions` (يرجع صفقات البائع كطرف بائع — عبر ربط `asset_id → seller_id`).
- تعرض: من اشترى، كمية، `principal_amount` اللي استلمه البائع كامل (بدون خصم عمولة).

---

## هذي آخر محطة — شنو ممكن يصير بعدها؟
من هذي الصفحة، الدورة تكمل من جديد:
- المستثمر يرجع يتصفح عروض جديدة (`03-market-browsing.md`) أو يجدد اشتراكه (`07-premium-subscription.md`).
- البائع يضيف عرض جديد (`06-seller-listing.md`) أو يروّج عرض موجود.

**لا يوجد "نهاية" ثابتة بالمنصة** — هذا Workflow هو نقطة رجوع دورية (Loop) وليس محطة أخيرة تقنياً، بس هو أبعد نقطة توصلها رحلة المستخدم من ناحية "شنو يشوف بعد ما يسوي كل شي".

## حالات الخطأ
| الحالة | error_code | السلوك |
|---|---|---|
| فشل التحقق من `digital_signature_token` | `INTEGRITY_CHECK_FAILED` | رفض عرض الرصيد + تسجيل حادثة أمنية |
| مستثمر جديد بدون أي صفقة سابقة | — | يُعرض `total_accumulated_grams = 0` + رسالة "ابدأ أول استثمار" وزر يوديه لـ `03-market-browsing.md` |

## Entities المرتبطة
`FractionalOwnershipRecord` (قراءة + تحقق) · `Transaction` (قراءة) · `AssetListing` (قراءة، للبائع) · `User.subscription_tier`

## Endpoints المرتبطة
`GET /api/ownership/me` · `GET /api/transactions` · `GET /api/listings` · `GET /api/subscription/status`
