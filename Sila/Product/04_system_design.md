# Document 6: System Design (v1 — Final)

منصة **صِلة (Sila)** — معمارية النظام، الـ Stack، تقسيم الموديولات، وتحصين الأمان.

## 1. Architecture Style

**Modular Monolith** (مو Microservices) — مناسب لهاكاثون 4 أيام: كودبيس وحدة،
نشر أسهل، بس كل Module مفصول منطقياً (Service Layer مستقل لكل Business
Capability) حتى نقدر نفصله لـ Microservice بالمستقبل بدون إعادة كتابة.

```
┌─────────────────────────────────────────────┐
│   Presentation Layer — React (SPA)           │
│   Investor Dashboard | Seller Dashboard      │
└───────────────────┬───────────────────────────┘
                     │ REST (JSON, HTTPS)
┌───────────────────▼───────────────────────────┐
│   API Layer — FastAPI (Pydantic validation)   │
│   Auth Middleware | Rate Limiting | CORS      │
└───────────────────┬───────────────────────────┘
                     │
┌───────────────────▼───────────────────────────┐
│   Service Layer (Business Logic)              │
│  ┌──────────┐┌──────────┐┌──────────┐┌───────┐│
│  │ Identity ││  Market  ││ Listing  ││  AI   ││
│  │ Security ││   Data   ││  Asset   ││Engine ││
│  └──────────┘└──────────┘└──────────┘└───────┘│
│    ┌────────────────┐  ┌──────────────────┐    │
│    │ Order &         │  │ Subscription &    │    │
│    │ Transaction     │  │ Mock Payment      │    │
│    └────────────────┘  └──────────────────┘    │
└───────────────────┬───────────────────────────┘
                     │ SQLAlchemy ORM
┌───────────────────▼───────────────────────────┐
│   Data Layer — PostgreSQL                     │
└─────────────────────────────────────────────────┘

External Integrations:
  → Gold/USD Live Price API (polled + cached)
  → AI Provider API (Matching / Risk Insights)
  → Mock "توقيعك" KYC Simulation (internal, no real gov API)
```

## 2. Stack

| الطبقة | التقنية | السبب |
|---|---|---|
| Frontend | React (Vite) | سرعة تطوير، خبرة الفريق بـ front-end |
| Backend | Python / FastAPI | Async native، تكامل سهل مع AI APIs، Pydantic validation تلقائي |
| Database | PostgreSQL | علائقية حقيقية (FK constraints)، ACID transactions ضرورية للبيانات المالية |
| ORM | SQLAlchemy (+ Alembic للـ migrations) | Type-safe queries، migration versioning |
| Auth | JWT (access + refresh token) | Stateless، سهل التطبيق بـ FastAPI |
| Background Jobs | APScheduler أو Celery+Redis | تحديث أسعار الذهب/الدولار دورياً + فحص انتهاء الاشتراكات يومياً |
| Hashing | `hashlib` (SHA-256) + HMAC بمفتاح سري على السيرفر | توليد `DigitalSignatureToken` |

## 3. Module Breakdown (مطابق للـ Business Capabilities)

| Module | يغطي |
|---|---|
| **Identity & Security** | Signup/Login، KYC Mock (مستثمر + بائع)، توليد `DigitalSignatureToken` |
| **Market Data** | جلب أسعار API، Karat Adjustment Engine، الكاش |
| **Listing & Asset** | CRUD لـ `AssetListing`، منطق Promoted Listing |
| **AI Engine** | Smart Matching، Premium Insights، Pre-Checkout Risk Analysis |
| **Order & Transaction** | Checkout flow، حساب Commission، تنفيذ الصفقة، تحديث `FractionalOwnershipRecord` |
| **Subscription & Mock Payment** | اشتراك Premium الشهري، بوابة الدفع الوهمية (ترويج + اشتراك) |

## 4. نقطة تصميم حرجة: تنفيذ الصفقة (Concurrency)

خصم `AvailableWeightGrams` وإنشاء `Transaction` وتحديث
`FractionalOwnershipRecord` **لازم يصيرون بعملية DB واحدة atomic** (DB
Transaction + Row-Level Lock عبر `SELECT ... FOR UPDATE`) حتى نمنع سيناريو
مستثمرين اثنين يشترون بنفس اللحظة ويتجاوز المجموع الكمية المتاحة
(Race Condition). هذي نقطة أمان مالي أساسية، مو تفصيل تنفيذي بس.

## 5. Security Hardening Checklist

- [ ] **Passwords:** Bcrypt hashing.
- [ ] **Auth:** JWT قصير العمر (access token) + Refresh token، وتخزين آمن (httpOnly cookie أو secure storage).
- [ ] **Transport:** HTTPS إجباري على كل الـ endpoints.
- [ ] **Validation:** كل input يمر عبر Pydantic schemas (FastAPI تلقائياً).
- [ ] **RBAC:** فصل صريح بين endpoints المستثمر والبائع حسب `Role`.
- [ ] **KYC Gate:** التحقق من `KycVerified` يصير **من السيرفر** وقت الشراء أو نشر العرض، مو من الـ Frontend فقط.
- [ ] **Concurrency Safety:** DB transactions + row locking على تنفيذ الصفقات.
- [ ] **Signature Secret:** مفتاح توليد `DigitalSignatureToken` يبقى Server-side فقط (Environment Variable).
- [ ] **Rate Limiting:** خصوصاً على `/login` و`/ai/*` و`/kyc/*` endpoints.
- [ ] **CORS:** مقيد لدومين الـ Frontend بس.
- [ ] **Secrets Management:** كل الـ API keys بملف `.env`، غير مرفوعة للـ Git.
- [ ] **SQL Injection:** محمي تلقائياً عبر SQLAlchemy ORM.
- [ ] **Audit Logging:** تسجيل كل عملية `Transaction` و`FractionalOwnershipRecord` update.

## 6. ⚠️ Flag — يحتاج مدخل قانوني (Needs Legal Input)

`Cryptographic Ownership Proof` (الـ `DigitalSignatureToken`) هو إثبات ملكية
تقني داخل قاعدة بياناتنا فقط — **مو إثبات ملكية قانوني معترف بيه رسمياً**.
بالـ MVP هذا مقبول (Out-of-Scope حسب Product Vision)، بس أي تطوير بعد
الهاكاثون لازم يوضح للمستخدم إنه هذا التوثيق داخلي وليس بديل عن تسجيل ملكية
حكومي رسمي.
