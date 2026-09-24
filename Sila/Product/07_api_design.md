# Document 8: API Design (v2 — Final)

منصة **صِلة (Sila)** — REST API كاملة، JSON، مربوطة بالموديولات المحددة بـ
System Design. كل الـ endpoints المحمية تتطلب `Authorization: Bearer <JWT>`.

---

## 1. Identity & Security Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/auth/signup` | عام | تسجيل حساب جديد (`role`, `full_name`, `email`, `password`, `risk_profile` إذا `investor`) |
| POST | `/api/auth/login` | عام | تسجيل دخول → يرجع `access_token` + `refresh_token` |
| POST | `/api/auth/refresh` | Refresh Token | يجدد الـ `access_token` |
| GET | `/api/users/me` | مستخدم مسجل | بيانات البروفايل الحالي |
| POST | `/api/kyc/verify` | مستثمر | يوثق المستثمر — Trigger وقت أول شراء |
| POST | `/api/kyc/seller` | بائع | يوثق البائع — Trigger إجباري وقت أول عرض |

**ملاحظة أمنية:** `/api/auth/login`, `/api/kyc/verify`, `/api/kyc/seller`
تحت Rate Limiting صارم.

---

## 2. Market Data Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| GET | `/api/market/prices` | عام | آخر سعر ذهب (لكل عيار: 18/21/22/24) + سعر الدولار/الدينار — من كاش داخلي يحدّثه Background Job |

---

## 3. Listing & Asset Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/listings` | بائع | إنشاء عرض جديد (`total_weight_grams`, `karat`) — يفحص `KycVerified` أولاً؛ `base_price_per_gram` يُحسب سيرفرياً |
| GET | `/api/listings` | عام | تصفح/بحث العروض — فلاتر: `karat`, `min_price`, `max_price`, `sort=promoted_first` |
| GET | `/api/listings/{id}` | عام | تفاصيل عرض واحد |
| PATCH | `/api/listings/{id}` | بائع (المالك) | تعديل/تعليق العرض (`status`) |
| POST | `/api/listings/{id}/promote` | بائع (المالك، موثق) | يفعّل الإدراج المميز — يستدعي داخلياً `/api/payments/mock` |

> قيمة رسم الإدراج المميز Config Value ثابت سيرفرياً — غير قابل للتعديل من الـ Client.

---

## 4. AI Engine Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/ai/match` | مستثمر | Input: `budget_iqd` (يُضاف `risk_profile` تلقائياً من حساب المستثمر) → Output: عروض مقترحة، مجاني للكل |
| GET | `/api/ai/insights` | مستثمر (`subscription_expiry_date > now()`) | تنبيهات ذكية + تحليل اتجاه السوق + أداء المحفظة — `403 SUBSCRIPTION_REQUIRED` إذا منتهي |
| POST | `/api/ai/risk-analysis` | مستثمر | Input: `asset_id`, `weight_grams` → Output: رسالة AI Risk Insight (تُستخدم بشاشة الـ Checkout) |

---

## 5. Order & Transaction Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/transactions/preview` | مستثمر | يحسب `principal_amount` + `commission_amount` + `total_paid` + AI Risk Insight — بدون تنفيذ |
| POST | `/api/transactions/confirm` | مستثمر (KYC مطلوب) | ينفذ الصفقة فعلياً — Atomic DB Transaction (Row Lock) + تحديث `FractionalOwnershipRecord` + توليد `DigitalSignatureToken` |
| GET | `/api/transactions` | مستخدم مسجل | سجل صفقات المستخدم (مستثمر: مشترياته / بائع: مبيعاته) |
| GET | `/api/transactions/{id}` | صاحب العملية فقط | تفاصيل صفقة واحدة |

**تسلسل الـ Checkout:** `preview` → شاشة التأكيد → `confirm` (يفحص
`kyc_verified` سيرفرياً أولاً؛ لو `false` يرجع `403` ويوجه لـ `/api/kyc/verify`).

---

## 6. Subscription Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/subscription/subscribe` | مستثمر | يستدعي `/api/payments/mock` داخلياً، ويضيف 30 يوم على `subscription_expiry_date` (يمدد من تاريخ الانتهاء الحالي لو ساري، أو من `now()` لو منتهي/غير موجود) ويحدّث `subscription_tier = 'premium'` |
| GET | `/api/subscription/status` | مستثمر | يرجع `subscription_tier` + `subscription_expiry_date` الحاليين |

---

## 7. Mock Payment Services

| Method | Path | Auth | الوصف |
|---|---|---|---|
| POST | `/api/payments/mock` | مستخدم مسجل (Internal call فقط) | يمثل بوابة دفع وهمية — يرجع `200 { "status": "success", "payment_ref": "<uuid>" }` مباشرة بدون تكامل حقيقي. يُستدعى داخلياً من `subscribe` و`promote` فقط |

> **ملاحظة تصميم:** خليناه Internal call من الـ Service Layer وليس Endpoint
> عام يناديه الـ Frontend مباشرة، حتى كل عملية دفع تبقى مربوطة بسياق واضح
> ومسجلة بـ Audit Log — يسهّل استبداله ببوابة دفع حقيقية بالمستقبل بدون
> تغيير عقد الـ API الخارجي.

---

## 8. Ownership Module

| Method | Path | Auth | الوصف |
|---|---|---|---|
| GET | `/api/ownership/me` | مستثمر | يرجع `total_accumulated_grams` بعد التحقق من صحة `DigitalSignatureToken`؛ `403 INTEGRITY_CHECK_FAILED` لو التحقق فشل |

---

## 9. Error Response Standard

```json
{
  "error_code": "KYC_NOT_VERIFIED",
  "message": "يجب إكمال التوثيق قبل إتمام عملية الشراء",
  "status": 403
}
```

أكواد أساسية: `INSUFFICIENT_AVAILABLE_WEIGHT`, `KYC_NOT_VERIFIED`,
`SUBSCRIPTION_REQUIRED`, `LISTING_NOT_ACTIVE`, `INTEGRITY_CHECK_FAILED`,
`VALIDATION_ERROR`.
