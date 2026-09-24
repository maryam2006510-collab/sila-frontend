# Document 3: Business Capabilities (v4 — Final)

منصة **صِلة (Sila)** — خرائط القدرات الوظيفية الكاملة بعد كل التعديلات (v2 → v4).

## 1. Identity & Security Management (إدارة الهوية والأمان)
* **User Onboarding:** تسجيل حسابات المستثمرين والبائعين.
* **KYC & Authentication (Mock):** محاكاة ربط المنصة بـ "توقيعك" للتحقق من الهوية —
  **إجباري للمستثمر** (Triggered on Buy action) **وإجباري للبائع** (Triggered on first Listing creation).
* **Cryptographic Ownership Proof:** توليد وحفظ التواقيع الرقمية المشفرة (Hashes) لتأكيد ملكية المستثمر للحصص الذهبية.

## 2. Market Data Integration (إدارة بيانات السوق)
* **Live Price Engine:** سحب أسعار الذهب والدولار لحظياً عبر APIs (السعر العالمي مبني على عيار 24).
* **Pricing Converter:** تحويل الأسعار العالمية إلى الدينار العراقي.
* **Karat Adjustment Engine:** تحويل سعر الغرام من عيار 24 (المرجع العالمي) لعيار العرض الفعلي (18/21/22/24) بمعامل ثابت `Karat/24`، يُطبَّق وقت إنشاء العرض ووقت تنفيذ كل عملية شراء.

## 3. Listing & Asset Management (إدارة العروض والأصول)
* **Fractional Listing:** قدرة البائع على إضافة كمية ذهب للبيع المجزأ — السعر يُحسب سيرفرياً عبر Karat Adjustment Engine (البائع لا يحدد سعره الخاص، ضماناً للعدالة والشفافية).
* **Promoted Listings (Seller Monetization):** البائع يدفع رسماً مقطوعاً (عبر Mock Payment) ليظهر عرضه في أعلى نتائج البحث لفترة زمنية محددة.

## 4. AI & Analytics Engine (محرك الذكاء الاصطناعي)
* **Smart Matching (Free):** مطابقة ميزانية المستثمر مع العروض المتاحة، مجانية للجميع، تستخدم `RiskProfile` تلقائياً.
* **Premium AI Insights (Investor Subscription):** تنبيهات ذكية، تحليل اتجاه السوق، وتقارير أداء المحفظة — اشتراك **شهري متجدد** (30 يوماً) عبر Mock Payment، الوصول يُفحص بـ `SubscriptionExpiryDate`.
* **Pre-Checkout AI Risk Analysis:** تحليل فوري لعملية الشراء قبل تأكيدها.

## 5. Order & Transaction Management (إدارة الطلبات والعمليات)
* **Fractional Execution:** تنفيذ شراء جزء من الذهب وخصمها من الكمية المتاحة — عبر DB Transaction Atomic مع Row-Level Locking لمنع Race Conditions.
* **Dynamic Tiered Commission:** استقطاع عمولة متدرجة حسب حجم الصفقة، **تُضاف فوق قيمة الذهب وتُخصم من المستثمر** (البائع يستلم قيمة الذهب كاملة بدون خصم):
  - صفقات صغيرة (< 50 غرام): 1.5%
  - صفقات متوسطة (50-200 غرام): 1.0%
  - صفقات كبيرة (> 200 غرام): 0.5%
