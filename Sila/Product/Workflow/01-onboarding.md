# Workflow 01: Onboarding (التسجيل والدخول الأول)

**الفاعلون (Actors):** مستخدم جديد (لسا ما عنده حساب) — يصبح Investor أو Seller.
**المحفّز (Trigger):** المستخدم يفتح المنصة لأول مرة.
**الشروط المسبقة:** لا يوجد — هذا أول خطوة بالمنصة كلها.

---

## الخطوات بالتفصيل

### 1. شاشة الترحيب / اختيار الدور
- المستخدم يوصل لصفحة رئيسية تعرض خيارين: **"سجّل كمستثمر"** أو **"سجّل كبائع"**.
- الاختيار هذا يحدد قيمة `Role` بالـ `User` entity — ثابت بعد التسجيل، ما ينتغير لاحقاً بنفس الحساب (لو حبى يصير الاثنين، يسوي حساب ثاني بإيميل مختلف).

### 2. نموذج التسجيل (Signup)
- **إذا اختار Investor:**
  الحقول المطلوبة: `full_name`, `email`, `password`, و**`risk_profile`** (يختار من Low / Medium / High — يُستخدم لاحقاً بمحرك AI Smart Matching).
- **إذا اختار Seller:**
  الحقول المطلوبة: `full_name`, `email`, `password` فقط — `risk_profile` غير مطلوب للبائع.
- **Endpoint:** `POST /api/auth/signup`
- **فحوصات السيرفر:**
  - `email` فريد (Unique) — لو مستخدم من قبل يرجع `409 Conflict`.
  - `password` يُشفّر فوراً بـ Bcrypt قبل التخزين (`password_hash`) — النص الصريح ما ينخزن أبداً.
  - عند الإنشاء: `kyc_verified = false`, `subscription_tier = 'free'` (Default حتى لو Seller — الحقل موجود على كل `User` بس فعلياً يُستخدم للمستثمر فقط).

### 3. تسجيل الدخول (Login)
- **Endpoint:** `POST /api/auth/login`
- المستخدم يدخل `email` + `password` → السيرفر يتحقق من `password_hash` ويرجع `access_token` (قصير العمر) + `refresh_token`.
- الـ Frontend يخزن التوكنات ويرفقها بكل Request لاحق (`Authorization: Bearer`).

### 4. أول دخول للوحة التحكم (Dashboard)
- بعد تسجيل الدخول، النظام يوجه المستخدم حسب `Role`:
  - **Investor →** لوحة تعرض أسعار الذهب اللحظية (`GET /api/market/prices`) + زر "ابدأ المطابقة الذكية".
  - **Seller →** لوحة فاضية تعرض "ماكو عروض بعد — أضف أول عرض" + زر "إضافة عرض جديد".
- بهذي المرحلة **لا يوجد أي فحص KYC بعد** — المستخدم يكدر يتصفح المنصة بحرية كاملة، الـ KYC ينفحص بس عند أول Action حساس (شراء للمستثمر، أو نشر عرض للبائع — انظر `02-kyc-verification.md`).

---

## بعد إتمام هذا الـ Workflow (Postconditions)
- سجل `User` جديد موجود بقاعدة البيانات بحالة `kyc_verified = false`.
- المستخدم عنده جلسة نشطة (Access + Refresh Token).
- المستخدم بلوحة تحكم فارغة/ابتدائية، جاهز يبدأ رحلته الفعلية:
  - **Investor →** ينتقل لـ `03-market-browsing.md`.
  - **Seller →** ينتقل مباشرة لـ `06-seller-listing.md`.

## حالات الخطأ (Edge Cases)
| الحالة | السلوك |
|---|---|
| إيميل مستخدم من قبل | `409 Conflict` + رسالة "هذا الإيميل مسجل مسبقاً" |
| كلمة مرور ضعيفة | Validation error من Pydantic Schema (حد أدنى 8 أحرف مثلاً) |
| محاولات دخول فاشلة متكررة | Rate Limiting يحجب الـ IP مؤقتاً (حسب Security Checklist) |

## Entities المرتبطة
`User` (كامل الحقول عدا `subscription_expiry_date` و`digital_signature_token` اللي تنحدد لاحقاً)

## Endpoints المرتبطة
`POST /api/auth/signup` · `POST /api/auth/login` · `POST /api/auth/refresh` · `GET /api/users/me`
