# Document 2: Domain Model (v3 — Final)

منصة **صِلة (Sila)** — نموذج البيانات الكامل بعد كل التعديلات (v1 → v3).

## 1. Core Entities & Attributes

### 1.1 User (المستخدم)
يمثل كلا من المستثمر والبائع.
*   **UserID:** (UUID) - المعرف الفريد.
*   **Role:** (Enum: `Investor`, `Seller`) - تحديد نوع الحساب.
*   **FullName:** (String) - الاسم الكامل.
*   **Email:** (String) - البريد الإلكتروني (Unique).
*   **PasswordHash:** (String) - كلمة المرور مشفرة (Bcrypt).
*   **KycVerified:** (Boolean) - حالة التوثيق القانوني (محاكاة "توقيعك"). للمستثمر: يتوثق وقت أول عملية شراء. للبائع: يتوثق وقت أول عرض.
*   **RiskProfile:** (Enum: `Low`, `Medium`, `High`) - خاص بالمستثمر فقط، يُحدَّد عند التسجيل لمساعدة الـ AI.
*   **SubscriptionTier:** (Enum: `Free`, `Premium`) - خاص بالمستثمر، يتحكم بالوصول لـ Premium AI Insights (Default: `Free`).
*   **SubscriptionExpiryDate:** (TIMESTAMPTZ, Nullable) - تاريخ انتهاء اشتراك Premium الحالي (اشتراك شهري متجدد). كل ميزة Premium تفحص هذا التاريخ مباشرة، وليس `SubscriptionTier` لحاله.

### 1.2 AssetListing (العرض المالي - الذهب)
يمثل الكمية الإجمالية اللي يعرضها البائع.
*   **AssetID:** (UUID) - المعرف الفريد للعرض.
*   **SellerID:** (UUID) - مفتاح أجنبي (Foreign Key) يربط العرض بالبائع.
*   **TotalWeightGrams:** (Float) - الوزن الكلي المعروض للبيع.
*   **AvailableWeightGrams:** (Float) - الوزن المتبقي والمتاح للشراء (يقل مع كل عملية).
*   **Karat:** (Integer) - عيار الذهب (مثلاً 18، 21، 22، 24).
*   **BasePricePerGram:** (Float) - السعر الابتدائي للغرام وقت إنشاء العرض (كمرجع، محسوب سيرفرياً حسب قاعدة تحويل العيار).
*   **Status:** (Enum: `Active`, `SoldOut`, `Suspended`).
*   **IsPromoted:** (Boolean) - هل العرض مُدرَج بشكل مميز (Highlighted) - Default: `false`.
*   **PromotionExpiryDate:** (DateTime, Nullable) - تاريخ انتهاء الإدراج المميز؛ `null` يعني العرض غير مُروَّج.

### 1.3 Transaction (عملية الشراء)
تمثل شراء المستثمر لجزء من الذهب.
*   **TransactionID:** (UUID).
*   **InvestorID:** (UUID) - مفتاح أجنبي للمستثمر.
*   **AssetID:** (UUID) - مفتاح أجنبي للذهب.
*   **PurchasedWeightGrams:** (Float) - الكمية اللي تم شراؤها.
*   **ExecutionPricePerGram:** (Float) - السعر الفعلي وقت الشراء (من الـ API المباشر، بعد تحويل العيار).
*   **PrincipalAmount:** (Float) - قيمة الذهب الصافية = `PurchasedWeightGrams × ExecutionPricePerGram`.
*   **CommissionRate:** (Float) - نسبة العمولة المطبقة (حسب الـ Tier).
*   **CommissionAmount:** (Float) - قيمة العمولة = `PrincipalAmount × CommissionRate`.
*   **TotalPaidByInvestor:** (Float) - المبلغ الكلي = `PrincipalAmount + CommissionAmount`.
*   **Timestamp:** (DateTime) - وقت العملية الدقيق.

### 1.4 FractionalOwnershipRecord (سجل الملكية المشفر - Security Core)
قلب الأمان بالمنصة، يثبت ملكية المستثمر للحصص.
*   **RecordID:** (UUID).
*   **InvestorID:** (UUID).
*   **TotalAccumulatedGrams:** (Float) - مجموع ما يملكه المستثمر.
*   **DigitalSignatureToken:** (String) - توقيع رقمي مشفر (Cryptographic Hash) يجمع بين (InvestorID + TotalGrams + Timestamp) لمنع أي تلاعب يدوي بالرصيد.

## 2. Entity Relationships
*   **User (Seller)** 1 : N **AssetListing** (البائع يكدر يعرض أكثر من كمية ذهب).
*   **User (Investor)** 1 : N **Transaction** (المستثمر يكدر يسوي أكثر من عملية شراء).
*   **AssetListing** 1 : N **Transaction** (عرض الذهب الواحد ممكن يشترون منه أكثر من مستثمر).
*   **User (Investor)** 1 : 1 **FractionalOwnershipRecord** (لكل مستثمر سجل ملكية واحد يتحدث مع كل عملية).

## 3. Business Rules (Entity-Level)

*   **Validation:** لا يمكن إتمام الـ `Transaction` إذا كان `PurchasedWeightGrams` أكبر من `AvailableWeightGrams`.
*   **State Change:** بمجرد ما يوصل `AvailableWeightGrams` إلى صفر، يتحول `Status` تلقائياً إلى `SoldOut`.
*   **Security Rule:** أي تعديل على `TotalAccumulatedGrams` بدون إعادة توليد `DigitalSignatureToken` بمفتاح التشفير السري السيرفري، يعتبر اختراق والمنصة ترفض قراءة الرصيد.

### 3.1 قاعدة تحويل سعر العيار
سعر الذهب العالمي (من الـ Live Price Engine) مبني على عيار 24. نطبق معامل تحويل ثابت:

```
PricePerGram(Karat) = GlobalPricePerGram24k × (Karat / 24)
```

مثال: سعر عيار 24 = 145,000 دينار/غرام → سعر عيار 21 = `145,000 × (21/24)` ≈ 126,875 دينار.
تُطبَّق وقت إنشاء العرض (`BasePricePerGram`) ووقت تنفيذ الشراء (`ExecutionPricePerGram`).

### 3.2 قاعدة العمولة المتدرجة
العمولة **تُضاف على سعر الشراء** وتُخصم من **المستثمر** فوق قيمة الذهب الصافية (البائع يستلم `PrincipalAmount` كامل بدون خصم):

| حجم الصفقة | نسبة العمولة |
|---|---|
| أقل من 50 غرام | 1.5% |
| 50 - 200 غرام | 1.0% |
| أكثر من 200 غرام | 0.5% |

```
PrincipalAmount      = PurchasedWeightGrams × ExecutionPricePerGram
CommissionAmount     = PrincipalAmount × CommissionRate
TotalPaidByInvestor  = PrincipalAmount + CommissionAmount
```
