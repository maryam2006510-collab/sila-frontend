# Document 7: ERD / Database Design (v2 — Final)

منصة **صِلة (Sila)** — جداول قاعدة البيانات الكاملة بالأنواع والفهارس.

> **ملاحظة تنفيذية:** استخدمنا `NUMERIC` بدل `FLOAT` لكل الحقول المالية
> والأوزان — لأن `FLOAT` عنده أخطاء تقريب (rounding errors) غير مقبولة
> بحسابات مالية ووزن ذهب دقيق.

## 1. Table: `users`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| role | ENUM('investor','seller') | NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, **UNIQUE** |
| password_hash | VARCHAR(255) | NOT NULL |
| kyc_verified | BOOLEAN | NOT NULL, DEFAULT `false` |
| risk_profile | ENUM('low','medium','high') | NULLABLE (خاص بالمستثمر بس) |
| subscription_tier | ENUM('free','premium') | NOT NULL, DEFAULT `'free'` |
| subscription_expiry_date | TIMESTAMPTZ | NULLABLE — تاريخ انتهاء اشتراك Premium الحالي |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:**
- `UNIQUE INDEX idx_users_email ON users(email)`
- `INDEX idx_users_role ON users(role)`
- `INDEX idx_users_sub_expiry ON users(subscription_expiry_date)` — يسهّل Background Job فحص الاشتراكات المنتهية يومياً

---

## 2. Table: `asset_listings`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| seller_id | UUID | FK → `users.id`, NOT NULL |
| total_weight_grams | NUMERIC(10,3) | NOT NULL, CHECK `> 0` |
| available_weight_grams | NUMERIC(10,3) | NOT NULL, CHECK `>= 0` |
| karat | SMALLINT | NOT NULL, CHECK `IN (18,21,22,24)` |
| base_price_per_gram | NUMERIC(14,2) | NOT NULL |
| status | ENUM('active','sold_out','suspended') | NOT NULL, DEFAULT `'active'` |
| is_promoted | BOOLEAN | NOT NULL, DEFAULT `false` |
| promotion_expiry_date | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:**
- `INDEX idx_listings_seller ON asset_listings(seller_id)`
- `INDEX idx_listings_status ON asset_listings(status)`
- `INDEX idx_listings_promoted ON asset_listings(is_promoted, promotion_expiry_date)`

---

## 3. Table: `transactions`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| investor_id | UUID | FK → `users.id`, NOT NULL |
| asset_id | UUID | FK → `asset_listings.id`, NOT NULL |
| purchased_weight_grams | NUMERIC(10,3) | NOT NULL, CHECK `> 0` |
| execution_price_per_gram | NUMERIC(14,2) | NOT NULL |
| principal_amount | NUMERIC(16,2) | NOT NULL |
| commission_rate | NUMERIC(5,4) | NOT NULL |
| commission_amount | NUMERIC(16,2) | NOT NULL |
| total_paid_by_investor | NUMERIC(16,2) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:**
- `INDEX idx_tx_investor ON transactions(investor_id)`
- `INDEX idx_tx_asset ON transactions(asset_id)`
- `INDEX idx_tx_created ON transactions(created_at)`

---

## 4. Table: `fractional_ownership_records`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| investor_id | UUID | FK → `users.id`, NOT NULL, **UNIQUE** (علاقة 1:1) |
| total_accumulated_grams | NUMERIC(12,3) | NOT NULL, DEFAULT `0` |
| digital_signature_token | VARCHAR(512) | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:**
- `UNIQUE INDEX idx_ownership_investor ON fractional_ownership_records(investor_id)`

---

## 5. Relationships Summary

```
users (seller)      1 ──< asset_listings
users (investor)    1 ──< transactions
asset_listings      1 ──< transactions
users (investor)    1 ── 1 fractional_ownership_records
```

## 6. Referential Actions

- `asset_listings.seller_id` → `ON DELETE RESTRICT` (ما نگدر نحذف بائع عنده عروض نشطة).
- `transactions.investor_id` / `transactions.asset_id` → `ON DELETE RESTRICT` (السجل المالي ما ينحذف أبداً — Audit trail).
- `fractional_ownership_records.investor_id` → `ON DELETE CASCADE`.

---

**ملف DBML منفصل:** `05_schema.dbml` — جاهز يترفع مباشرة على [dbdiagram.io](https://dbdiagram.io).
