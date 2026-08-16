# خطة تحويل نظام Skoon SPA من IndexedDB/PWA إلى Next.js + Supabase

**نوع الوثيقة:** تقرير تحليل معماري وخطة Migration شاملة (قبل أي تنفيذ)
**النظام الحالي:** SkoonSPA — تطبيق مبيعات ومخزون وفواتير، عربي RTL، Offline-first
**الحالة:** تحليل كامل — لا يوجد كود منفَّذ بعد

---

## جدول المحتويات

1. Executive Summary
2. Current Architecture
3. Entity Analysis
4. Database Design (Supabase PostgreSQL)
5. Migration Mapping
6. Authentication Strategy
7. Offline Strategy
8. Next.js Architecture
9. Migration Roadmap
10. Risks & Recommendations
11. Final Deliverable — خطة التنفيذ النهائية

---

# 1. Executive Summary

## 1.1 ما هو النظام الحالي

SkoonSPA تطبيق نقطة بيع ومخزون وفوترة لمتجر تجزئة صغير، مبني بالكامل بـ **HTML/CSS/JavaScript ES Modules بلا أي Framework**، يعمل كـ **SPA** بموجّه قائم على الـ `hash` (`#/products`)، وكـ **PWA** كاملة (Service Worker + Web App Manifest + قابل للتثبيت). لا يوجد خادم، لا مصادقة، لا قاعدة بيانات مركزية — **كل البيانات محلية في IndexedDB على جهاز واحد**.

النظام ناضج هندسياً بشكل ملحوظ رغم بساطة التقنية الظاهرية:

- محاسبة مالية بوحدات صغرى صحيحة (لا Floating Point في أي حساب مالي).
- ثابت بنيوي صارم: كمية المنتج **لا تُكتب أبداً** إلا عبر سجلّ حركة مخزون في نفس المعاملة الذرية (`applyMovement`).
- لقطات تاريخية (Snapshots) لكل ما يؤثر على فاتورة وقت إنشائها (اسم المنتج، السعر، التكلفة، نسبة الضريبة) — تعديل منتج لاحقاً لا يُغيّر فاتورة قديمة أبداً.
- أرصدة العملاء **محسوبة** وليست مخزَّنة (تُشتق من الفواتير الآجلة والمدفوعات)، فلا يمكن أن تنحرف عن الحقيقة.
- الفريق نفسه وثّق مسبقاً (في `docs/future-backend.md`) بالضبط أي ميزات تحتاج خادماً ولماذا، وهذا يتقاطع بدقة مع هذا التقرير — سنبني عليه لا نكرره.

## 1.2 لماذا Migration الآن

الحدود الحالية التي يفرضها غياب الخادم (موثّقة صراحة في الكود والتوثيق الداخلي):

- **لا مزامنة بين الأجهزة** — كل جهاز جزيرة منعزلة بحكم عزل IndexedDB لكل Origin/متصفح.
- **لا مصادقة حقيقية** — أي "صلاحية" في جافاسكربت المتصفح قابلة للتجاوز من أدوات المطوّر، وليست أماناً فعلياً.
- **لا تعدد مستخدمين أو أدوار** — `inventoryMovements.actor` قيمته الثابتة "المستخدم"، لا هوية حقيقية.
- **لا فروع/مستودعات متعددة** — `products.quantity` قيمة مطلقة على مستوى الجهاز، لا مفهوم موقع.
- **مخاطرة فقدان بيانات حقيقية** — "مسح بيانات التصفح" أو تثبيت من نطاق مختلف يفقد كل شيء نهائياً؛ النسخ الاحتياطي إجراء يدوي لا حل جذري.

## 1.3 ما يجب ألا يُفقد في التحويل

هذه ليست تفاصيل تنفيذ بل **قيود تصميم يجب أن تُترجَم بنفس الصرامة إلى Supabase**:

| القيد الحالي                                                         | لماذا هو غير تفاوضي                                                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| كل مبلغ مالي عدد صحيح بوحدة صغرى (هللة/قرش)                          | يمنع أخطاء التقريب التراكمية في التقارير والضرائب                                                           |
| `quantity` المنتج تُشتق فقط من مجموع حركات المخزون                   | يمنع انحراف المخزون عن سجله المرجعي؛ في Postgres هذا يعني قيداً أو Trigger، وليس تحديثاً مباشراً من التطبيق |
| لقطات تاريخية في سطور الفاتورة (اسم، سعر، تكلفة، ضريبة)              | حماية التقارير المالية من إعادة الكتابة بأثر رجعي                                                           |
| رقم الفاتورة يُحجز ذرّياً مع إتمام البيع في معاملة واحدة             | يمنع تكرار الأرقام أو ثغرات في التسلسل                                                                      |
| المنتج/العميل لا يُحذف أبداً إن كان مستخدماً في فاتورة — يُعطَّل فقط | يحمي إمكانية قراءة السجل التاريخي                                                                           |
| العمل يجب أن يستمر بلا اتصال بالكامل (البيع، الطباعة، التقارير)      | جوهر المنتج لمتجر تجزئة قد ينقطع اتصاله                                                                     |

## 1.4 نظرة عامة على القرار المعماري

الانتقال المقترح **ليس** "أعد كتابة كل شيء إلى خادم واستغنِ عن Offline"، بل بنية هجينة:

```
IndexedDB (Cache/Outbox محلي) ⇄ Sync Engine ⇄ Supabase PostgreSQL (مصدر الحقيقة)
```

- **Supabase PostgreSQL** يصبح **مصدر الحقيقة الوحيد (Source of Truth)**.
- **IndexedDB يبقى موجوداً** — لكن دوره يتغيّر من "قاعدة البيانات الوحيدة" إلى "ذاكرة تخزين مؤقت محلي + طابور عمليات غير مُزامنة (Outbox)"، بحيث يستمر العمل Offline في نقطة البيع تحديداً.
- **Next.js App Router** يستبدل الـ Hash Router والـ Vanilla DOM rendering، مع الحفاظ على استراتيجية "شاشة تلو الأخرى محمّلة ديناميكياً" (Code Splitting) التي بناها الفريق أصلاً بـ `import()`.

---

# 2. Current Architecture

## 2.1 هيكل المجلدات الفعلي

```
SkoonSPA/
├── index.html                 نقطة الدخول HTML — يحمّل boot-guard.js
├── sw.js                       Service Worker (Cache-first للأصول، Network-first للتنقل)
├── manifest.webmanifest        PWA manifest
├── app.bundle.js                حزمة كلاسيكية مبنية (لدعم file:// حيث ES modules محجوبة)
├── package.json
│
├── src/
│   ├── app.js                  نقطة إقلاع SPA: DB → Settings → Shell → Router → SW
│   ├── router.js                موجّه Hash-based بدون مكتبات خارجية
│   ├── routes.js                تسجيل كل المسارات + Lazy import لكل شاشة
│   ├── boot-guard.js             سكربت كلاسيكي: يقرر تحميل bundle أو ES modules
│   │
│   ├── db/
│   │   ├── schema.js            تعريف IndexedDB stores + دوال الترقية (migrations)
│   │   ├── db.js                 طبقة وصول عامة لـ IndexedDB (tx, get, put, iterate...)
│   │   └── seed.js               تعبئة بيانات أولية (فئات افتراضية، إعدادات)
│   │
│   ├── repositories/            طبقة الوصول للبيانات — منطق العمل الأساسي هنا
│   │   ├── products.js          CRUD منتجات + فئات + بحث + حالة المخزون
│   │   ├── sales.js              إتمام/إلغاء بيع (Transaction ذرّية) + بيوع معلّقة
│   │   ├── inventory.js          حركات المخزون (المصدر الوحيد لتغيير الكمية) + أسباب التسوية
│   │   ├── customers.js          عملاء + حساب الذمم (ledger) + المدفوعات + كشف حساب
│   │   ├── expenses.js           مصروفات + فئات مصروفات
│   │   └── settings.js           إعدادات المتجر (key/value) + ذاكرة تخزين مؤقت
│   │
│   ├── services/                منطق لا يلمس IndexedDB مباشرة
│   │   ├── backup.js             تصدير/استيراد نسخة احتياطية JSON كاملة
│   │   ├── excel.js              استيراد/تصدير منتجات عبر Excel
│   │   ├── reports.js            تجميعات التقارير (مبيعات، أرباح، مخزون)
│   │   ├── print.js              طباعة فاتورة (A4 / حراري 80mm)
│   │   ├── pwa.js                تسجيل SW، حالة الاتصال، تقدير التخزين، كشف قدرة العمل أوفلاين
│   │   └── images.js             تصغير/ضغط صور المنتجات إلى data URL
│   │
│   ├── views/                    12 شاشة، كل واحدة وحدة ES مستقلة تُحمَّل عند الطلب
│   │   ├── dashboard.js          لوحة تحكم: KPIs، منتجات منخفضة المخزون، آخر الفواتير
│   │   ├── pos.js                 نقطة البيع (الأكبر: 823 سطراً) — سلة، دفع، بحث سريع
│   │   ├── products.js            قائمة المنتجات + فلاتر
│   │   ├── product-form.js        نموذج إضافة/تعديل + عرض تفاصيل منتج
│   │   ├── inventory.js           حركات المخزون + تسويات + جرد
│   │   ├── invoices.js            قائمة الفواتير + فلاتر
│   │   ├── invoice-detail.js      تفاصيل فاتورة + إلغاء + طباعة
│   │   ├── customers.js           قائمة عملاء + كشف حساب فردي
│   │   ├── expenses.js            مصروفات
│   │   ├── reports.js             تقارير (مبيعات/أرباح/مخزون/عملاء) بفلاتر فترة
│   │   ├── backup.js              نسخ احتياطي/استعادة
│   │   └── settings.js            إعدادات المتجر والفواتير والضريبة والطباعة
│   │
│   ├── components/                عناصر واجهة قابلة لإعادة الاستخدام (بلا Framework)
│   │   ├── shell.js               الهيكل العام: Sidebar + Topbar + Outlet
│   │   ├── ui.js                   أزرار، بطاقات، Empty states، Modal، إلخ
│   │   ├── table.js                جدول بيانات عام (فرز/صفحات)
│   │   ├── charts.js               رسوم بيانية بسيطة (SVG/Canvas يدوي على الأغلب)
│   │   ├── feedback.js             Toast + إدارة الـ Overlays
│   │   └── icons.js                مجموعة أيقونات SVG مضمّنة
│   │
│   ├── state/
│   │   └── store.js               مخزن حالة واجهة صغير (Pub/Sub) — للحالة العابرة فقط (اتصال، عربة، إعدادات محمّلة)، وليس لبيانات العمل
│   │
│   ├── validation/
│   │   └── validators.js          قواعد تحقق من صحة المدخلات (حدود الطول، الأرقام، إلخ)
│   │
│   └── utils/
│       ├── money.js                حساب مالي بوحدات صغرى صحيحة (toMinor, computeTotals, allocateProportionally)
│       ├── dates.js                 ISO + dayKey محلي + طوابع زمنية متزايدة تماماً (monotonicISO)
│       ├── id.js                    توليد UUID ببادئة نوعية + تنسيق رقم الفاتورة
│       ├── format.js                تنسيق عرض (عملة، أرقام)
│       ├── dom.js                   مساعد بناء DOM بلا innerHTML (حماية XSS)
│       └── xlsx.js                  قراءة/كتابة ملفات Excel في المتصفح
│
├── assets/                       خطوط (Tajawal عربي/لاتيني)، CSS، أيقونات PWA
├── tests/                        اختبارات وحدة (بلا إطار خارجي — harness.js مخصص)
├── tools/                        سكربتات بناء الحزمة الكلاسيكية + التقاط لقطات شاشة
└── docs/                          توثيق داخلي غني (data-model, security-review, offline-strategy, future-backend...)
```

## 2.2 الصفحات (الشاشات) وربطها بالمسارات

| المسار                                | الشاشة                           | الوظيفة                                                          |
| ------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `/dashboard`                          | dashboard.js                     | KPIs يومية، تنبيهات مخزون منخفض، آخر الفواتير                    |
| `/pos`                                | pos.js                           | نقطة البيع: بحث/باركود، سلة، خصم، ضريبة، دفع نقدي/آجل، تعليق بيع |
| `/products`                           | products.js                      | قائمة المنتجات مع فلاتر وفئات                                    |
| `/products/new`, `/products/:id/edit` | product-form.js (`render`)       | نموذج إنشاء/تعديل منتج                                           |
| `/products/:id`                       | product-form.js (`renderView`)   | عرض تفاصيل منتج                                                  |
| `/inventory`                          | inventory.js                     | حركات المخزون، تسويات، جرد                                       |
| `/invoices`                           | invoices.js                      | قائمة الفواتير بفلاتر (حالة، تاريخ، عميل)                        |
| `/invoices/:id`                       | invoice-detail.js                | تفاصيل فاتورة + إلغاء + طباعة                                    |
| `/customers`                          | customers.js (`render`)          | قائمة عملاء                                                      |
| `/customers/:id`                      | customers.js (`renderStatement`) | كشف حساب عميل (فواتير + مدفوعات + رصيد تراكمي)                   |
| `/expenses`                           | expenses.js                      | مصروفات وفئاتها                                                  |
| `/reports`                            | reports.js                       | تقارير مبيعات/أرباح/مخزون/عملاء بفلاتر فترة                      |
| `/backup`                             | backup.js                        | تصدير/استيراد نسخة احتياطية كاملة                                |
| `/settings`                           | settings.js                      | إعدادات المتجر، الفواتير، الضريبة، الطباعة، حالة PWA             |

## 2.3 الخدمات (Services) ودورها

| الخدمة       | الدور                                                                   | ملاحظة الترحيل                                                                                         |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `backup.js`  | تصدير/استيراد JSON كامل لكل المتاجر، فحص توافق `schemaVersion`          | يتحول إلى **Supabase Storage export + pg_dump منطقي عبر API Route**، مع الإبقاء على تصدير محلي اختياري |
| `excel.js`   | استيراد/تصدير منتجات Excel بالكامل في المتصفح                           | يبقى **من جهة العميل** (لا رفع ملفات) لكن يكتب عبر Server Action بدل IndexedDB مباشرة                  |
| `reports.js` | تجميع تقارير من مسح `sales`/`saleItems`/`inventoryMovements` في الذاكرة | ينتقل إلى **Postgres Views/Materialized Views + RPC functions** لأداء أفضل مع نمو البيانات             |
| `print.js`   | توليد HTML قابل للطباعة (A4/حراري)                                      | يبقى **Client Component** بالكامل — الطباعة محلية بطبيعتها                                             |
| `pwa.js`     | تسجيل Service Worker، حالة اتصال، تقدير تخزين                           | يتحول إلى **next-pwa / Workbox** + Service Worker مخصص للـ Sync Queue                                  |
| `images.js`  | تصغير صور المنتج إلى data URL مضمّن                                     | يتحول إلى **رفع إلى Supabase Storage** بدل data URL (تقليل حجم الصف وتفعيل CDN)                        |

## 2.4 قواعد العمل (Business Logic) الجوهرية المستخرجة من الكود

هذه القواعد **يجب** أن تُعاد كتابتها بنفس الدلالة في طبقة الخدمة على Supabase (Postgres Functions / RLS / Server Actions)، لا أن تبقى منطقاً في الواجهة فقط:

1. **إتمام بيع (`completeSale`)** — عملية ذرّية واحدة تشمل: قراءة/تحقق كل سطر، حساب المجاميع (خصم، ضريبة شاملة/غير شاملة)، حجز رقم فاتورة من عدّاد، إنشاء الفاتورة + السطور، تخفيض المخزون + تسجيل حركة لكل سطر، وزيادة العدّاد — **كل ذلك أو لا شيء منه**.
2. **إلغاء بيع (`cancelSale`)** — تعويض ذرّي: إعادة كل كمية للمخزون + حركة إلغاء لكل سطر + تحديث حالة الفاتورة إلى `cancelled` وتصفير `dueMinor`. **الفاتورة لا تُحذف أبداً.**
3. **`applyMovement` كمسار وحيد للمخزون** — أي تغيير على `quantity` يجب أن يمرّ عبره مع حركة مسجّلة في نفس المعاملة. هذا ثابت بنيوي صارم في الكود الحالي.
4. **منع الحذف المرجعي** — منتج/عميل/فئة لا يُحذف إن كان مرتبطاً بفاتورة أو مصروف؛ يُعطَّل (`isActive=false`) بدلاً من ذلك.
5. **حساب رصيد العميل من الحركات لا من حقل مخزَّن** — `balance = Σ(sales.dueMinor) − Σ(payments.amountMinor)`.
6. **توزيع الخصم تناسبياً على السطور** بلا فقد فلس (`allocateProportionally`) — الفرق يُسند لآخر سطر بوزن غير صفري.
7. **الضريبة الشاملة/غير الشاملة** تُحسب وتُجمّد (Snapshot) على مستوى الفاتورة وقت الإنشاء.
8. **ترقيم الفواتير ذرّي** — يُقرأ ويُزاد **داخل نفس معاملة البيع** لمنع التكرار تحت تزامن الطلبات.
9. **`dayKey` محلي مستقل عن `createdAt` UTC** — ضروري لتقارير يومية صحيحة بغض النظر عن فرق التوقيت.

---

# 3. Entity Analysis

## 3.1 الكيانات المستخرجة

| الكيان                      | الوصف                                           | المصدر (Store الحالي) |
| --------------------------- | ----------------------------------------------- | --------------------- |
| **Product**                 | منتج قابل للبيع، بسعر وتكلفة وكمية مشتقة        | `products`            |
| **Category**                | تصنيف منتجات                                    | `categories`          |
| **Customer**                | عميل — لا يحمل رصيداً مخزَّناً                  | `customers`           |
| **Sale (Invoice)**          | فاتورة بيع — رأس الفاتورة                       | `sales`               |
| **SaleItem (Invoice Item)** | سطر فاتورة — لقطة كاملة عن المنتج وقت البيع     | `saleItems`           |
| **Payment**                 | دفعة من عميل (تسوية ذمة أو دفعة مرتبطة بفاتورة) | `payments`            |
| **Expense**                 | مصروف تشغيلي                                    | `expenses`            |
| **ExpenseCategory**         | تصنيف مصروفات                                   | `expenseCategories`   |
| **InventoryMovement**       | حركة مخزون — السجل المرجعي الوحيد لتغيّر الكمية | `inventoryMovements`  |
| **AdjustmentReason**        | سبب مُدار لتسوية المخزون (لا نص حر)             | `adjustmentReasons`   |
| **SuspendedSale**           | بيع معلّق (سلة محفوظة، لا تحجز مخزوناً)         | `suspendedSales`      |
| **Setting**                 | صف `key/value` لإعدادات المتجر                  | `settings`            |
| **BackupRecord**            | سجل نسخة احتياطية محلية (آخر 5)                 | `backupRecords`       |

**كيانات غير موجودة حالياً لكن يشير إليها `future-backend.md` كتوسّع محتمل:** Supplier, PurchaseOrder, Location/Branch, StockLevel (لكل موقع), Shift, User/Role. سنموضعها في التصميم كجداول اختيارية للمراحل اللاحقة دون أن تعطّل المرحلة الأولى من الترحيل.

## 3.2 مخطط العلاقات (ERD نصّي)

```
Category (1) ──< (N) Product
Product  (1) ──< (N) InventoryMovement
Product  (1) ──< (N) SaleItem
Sale     (1) ──< (N) SaleItem
Customer (1) ──< (N) Sale                (nullable — null = عميل نقدي)
Customer (1) ──< (N) Payment
Sale     (1) ──< (0..N) Payment          (saleId غالباً null — الدفعة تُطبَّق على الذمة عموماً لا فاتورة بعينها)
ExpenseCategory (1) ──< (N) Expense
AdjustmentReason (1) ──< (N) InventoryMovement   (عبر reason، ربط منطقي لا FK صارم في الكود الحالي)
InventoryMovement.refId ─────────> Sale.id | AdjustmentReason.id | ...  (مرجع متعدد الأنواع polymorphic)
```

### ملاحظات جوهرية على العلاقات

- **كل العلاقات في IndexedDB منطقية فقط** — لا مفاتيح أجنبية حقيقية، الفحص المرجعي يتم يدوياً في كود التطبيق قبل الحذف. في Postgres **سنحوّلها إلى Foreign Keys حقيقية** مع `ON DELETE RESTRICT` لتطابق سلوك "امنع الحذف إن كان مستخدماً".
- **`InventoryMovement.refId` متعدد الأنواع (polymorphic)** — يشير أحياناً لفاتورة، أحياناً لتسوية، أحياناً لجرد. في Postgres سنستخدم عمود `ref_type` + `ref_id` (بدون FK صارم على `ref_id` لأنه متعدد الجداول)، مع تعليق توثيقي واضح، أو بديل أنظف: جدول `stock_adjustments` منفصل يُشار إليه بفهرس عادي.
- **`SaleItem` ليست مجرد "junction table"** — تحمل لقطة كاملة (اسم، وحدة، سعر بيع، سعر تكلفة) بحيث تعديل `Product` لاحقاً لا يمسّ فاتورة قديمة. **هذا يجب أن يبقى كأعمدة فعلية في جدول `sale_items`، وليس Join حي مع `products`.**
- **رصيد العميل ليس كياناً مخزَّناً بل View محسوبة** من `sales.due_minor` و`payments.amount_minor`.

---

# 4. Database Design (Supabase PostgreSQL)

> ملاحظة تصميم عامة: أضفنا `store_id` (معرّف المتجر/المستأجر) إلى كل جدول بيانات عمل، لأن Supabase تُبنى غالباً كنظام متعدد المستأجرين (SaaS) حتى لو كان العميل الأول متجراً واحداً — هذا يجعل RLS ممكناً من اليوم الأول بدل إعادة هيكلة لاحقة مؤلمة (راجع Migration Roadmap Phase 3).
> كل المبالغ تبقى `bigint` بوحدات صغرى صحيحة (نفس منطق `money.js`) — **لا `numeric`/`float` للمال إطلاقاً**، حفاظاً على نفس ضمانات الدقة.

## 4.1 `stores` (المستأجر / المتجر)

| العمود          | النوع       | القيود                          |
| --------------- | ----------- | ------------------------------- |
| `id`            | uuid        | PK, default `gen_random_uuid()` |
| `name`          | text        | NOT NULL                        |
| `owner_id`      | uuid        | FK → `auth.users.id`, NOT NULL  |
| `currency_code` | text        | default `'SAR'`                 |
| `created_at`    | timestamptz | default `now()`                 |

**فهارس:** `owner_id`.

## 4.2 `store_members` (ربط المستخدمين بالمتاجر + الأدوار)

| العمود       | النوع       | القيود                                           |
| ------------ | ----------- | ------------------------------------------------ |
| `id`         | uuid        | PK                                               |
| `store_id`   | uuid        | FK → `stores.id` ON DELETE CASCADE               |
| `user_id`    | uuid        | FK → `auth.users.id` ON DELETE CASCADE           |
| `role`       | text        | CHECK IN (`'owner','manager','cashier','stock'`) |
| `is_active`  | boolean     | default true                                     |
| `created_at` | timestamptz | default `now()`                                  |

**قيود:** UNIQUE (`store_id`, `user_id`).
**فهارس:** `user_id`, `store_id`.

## 4.3 `categories`

| العمود       | النوع       | القيود                                       |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid        | PK, default `gen_random_uuid()`              |
| `store_id`   | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL |
| `name`       | text        | NOT NULL                                     |
| `color`      | text        |                                              |
| `icon`       | text        |                                              |
| `sort_order` | int         | default 0                                    |
| `created_at` | timestamptz | default `now()`                              |

**قيود:** UNIQUE (`store_id`, `name`).
**فهارس:** `store_id`.

## 4.4 `products`

| العمود                | النوع       | القيود                                                                                                        |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                  | uuid        | PK, default `gen_random_uuid()`                                                                               |
| `store_id`            | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL                                                                  |
| `sku`                 | text        | NOT NULL                                                                                                      |
| `barcode`             | text        | NULL يسمح بالتكرار (مطابقة لسلوك IndexedDB الحالي)                                                            |
| `name`                | text        | NOT NULL                                                                                                      |
| `category_id`         | uuid        | FK → `categories.id` ON DELETE RESTRICT, NULL                                                                 |
| `unit`                | text        | default `'قطعة'`                                                                                              |
| `cost_minor`          | bigint      | NOT NULL default 0, CHECK >= 0                                                                                |
| `price_minor`         | bigint      | NOT NULL default 0, CHECK >= 0                                                                                |
| `tax_rate_bp`         | int         | NOT NULL default 0, CHECK BETWEEN 0 AND 10000                                                                 |
| `quantity`            | bigint      | NOT NULL default 0 — **يُحدَّث فقط عبر Trigger من `inventory_movements`، ممنوع الكتابة المباشرة (راجع §4.7)** |
| `low_stock_threshold` | int         | default 0                                                                                                     |
| `description`         | text        | CHECK (char_length(description) <= 500)                                                                       |
| `image_url`           | text        | رابط Supabase Storage بدل data URL                                                                            |
| `is_active`           | boolean     | default true                                                                                                  |
| `created_at`          | timestamptz | default `now()`                                                                                               |
| `updated_at`          | timestamptz | default `now()`, يُحدَّث بـ Trigger                                                                           |

**قيود:** UNIQUE (`store_id`, `sku`); UNIQUE (`store_id`, `barcode`) WHERE `barcode IS NOT NULL`.
**فهارس:** `store_id`, `category_id`, `store_id, is_active`، فهرس نصي (`gin`/`pg_trgm` أو `to_tsvector`) على `name` للبحث السريع بديل `nameLower`.

## 4.5 `customers`

| العمود       | النوع       | القيود                                       |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid        | PK                                           |
| `store_id`   | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL |
| `name`       | text        | NOT NULL                                     |
| `phone`      | text        |                                              |
| `note`       | text        |                                              |
| `is_active`  | boolean     | default true                                 |
| `created_at` | timestamptz | default `now()`                              |
| `updated_at` | timestamptz | default `now()`                              |

**فهارس:** `store_id`, `store_id, phone`.
**ملاحظة:** لا عمود رصيد — الرصيد View محسوبة (§4.13).

## 4.6 `sales` (الفواتير)

| العمود           | النوع       | القيود                                                                                                     |
| ---------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `id`             | uuid        | PK                                                                                                         |
| `store_id`       | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL                                                               |
| `number`         | text        | NOT NULL                                                                                                   |
| `status`         | text        | CHECK IN (`'completed','cancelled'`), default `'completed'`                                                |
| `payment_type`   | text        | CHECK IN (`'cash','credit'`)                                                                               |
| `customer_id`    | uuid        | FK → `customers.id` ON DELETE RESTRICT, NULL = عميل نقدي                                                   |
| `customer_name`  | text        | **لقطة** — لا تُشتق من `customers` وقت العرض                                                               |
| `subtotal_minor` | bigint      | NOT NULL                                                                                                   |
| `discount_type`  | text        | CHECK IN (`'percent','amount'`)                                                                            |
| `discount_value` | int         |                                                                                                            |
| `discount_minor` | bigint      | NOT NULL default 0                                                                                         |
| `tax_rate_bp`    | int         | NOT NULL — **لقطة**                                                                                        |
| `tax_inclusive`  | boolean     | NOT NULL — **لقطة**                                                                                        |
| `tax_minor`      | bigint      | NOT NULL default 0                                                                                         |
| `total_minor`    | bigint      | NOT NULL                                                                                                   |
| `paid_minor`     | bigint      | NOT NULL default 0                                                                                         |
| `due_minor`      | bigint      | NOT NULL default 0 — GENERATED ALWAYS AS (`total_minor - paid_minor`) STORED (اختياري) أو محسوب في التطبيق |
| `item_count`     | int         |                                                                                                            |
| `unit_count`     | int         |                                                                                                            |
| `cost_minor`     | bigint      | تكلفة البضاعة المباعة — لقطة مجمّعة                                                                        |
| `note`           | text        |                                                                                                            |
| `created_at`     | timestamptz | default `now()`                                                                                            |
| `updated_at`     | timestamptz | default `now()`                                                                                            |
| `day_key`        | date        | NOT NULL — **يُحسب من التوقيت المحلي للمتجر في وقت الإدراج، وليس UTC**                                     |
| `cancelled_at`   | timestamptz | NULL                                                                                                       |
| `cancel_reason`  | text        | NULL                                                                                                       |

**قيود:** UNIQUE (`store_id`, `number`).
**فهارس:** `store_id, day_key`, `store_id, customer_id`, `store_id, status`, `store_id, created_at DESC`.

## 4.7 `sale_items`

| العمود                | النوع       | القيود                                             |
| --------------------- | ----------- | -------------------------------------------------- |
| `id`                  | uuid        | PK                                                 |
| `sale_id`             | uuid        | FK → `sales.id` ON DELETE CASCADE, NOT NULL        |
| `product_id`          | uuid        | FK → `products.id` ON DELETE RESTRICT, NOT NULL    |
| `sku`                 | text        | **لقطة**                                           |
| `name`                | text        | **لقطة**                                           |
| `unit`                | text        | **لقطة**                                           |
| `quantity`            | int         | NOT NULL CHECK > 0                                 |
| `unit_price_minor`    | bigint      | NOT NULL — **لقطة**                                |
| `unit_cost_minor`     | bigint      | NOT NULL — **لقطة**، أساس تقارير الربحية التاريخية |
| `line_discount_minor` | bigint      | NOT NULL default 0                                 |
| `line_total_minor`    | bigint      | NOT NULL                                           |
| `day_key`             | date        | NOT NULL                                           |
| `created_at`          | timestamptz | default `now()`                                    |

**فهارس:** `sale_id`, `product_id`, `day_key`.

## 4.8 `payments`

| العمود         | النوع       | القيود                                           |
| -------------- | ----------- | ------------------------------------------------ |
| `id`           | uuid        | PK                                               |
| `store_id`     | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL     |
| `customer_id`  | uuid        | FK → `customers.id` ON DELETE RESTRICT, NOT NULL |
| `sale_id`      | uuid        | FK → `sales.id` ON DELETE SET NULL, NULL غالباً  |
| `amount_minor` | bigint      | NOT NULL CHECK > 0                               |
| `method`       | text        | CHECK IN (`'cash','bank','card','cheque'`)       |
| `reference`    | text        |                                                  |
| `note`         | text        |                                                  |
| `created_at`   | timestamptz | default `now()`                                  |
| `day_key`      | date        | NOT NULL                                         |

**فهارس:** `store_id, customer_id`, `store_id, day_key`.

## 4.9 `expense_categories`

| العمود       | النوع       | القيود                                       |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid        | PK                                           |
| `store_id`   | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL |
| `name`       | text        | NOT NULL                                     |
| `color`      | text        |                                              |
| `created_at` | timestamptz | default `now()`                              |

**قيود:** UNIQUE (`store_id`, `name`).

## 4.10 `expenses`

| العمود           | النوع       | القيود                                          |
| ---------------- | ----------- | ----------------------------------------------- |
| `id`             | uuid        | PK                                              |
| `store_id`       | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL    |
| `category_id`    | uuid        | FK → `expense_categories.id` ON DELETE RESTRICT |
| `title`          | text        | NOT NULL                                        |
| `amount_minor`   | bigint      | NOT NULL CHECK > 0                              |
| `method`         | text        |                                                 |
| `reference`      | text        |                                                 |
| `note`           | text        |                                                 |
| `attachment_url` | text        | رابط Supabase Storage بدل `dataUrl` مضمّن       |
| `day_key`        | date        | NOT NULL                                        |
| `created_at`     | timestamptz | default `now()`                                 |
| `updated_at`     | timestamptz | default `now()`                                 |

**فهارس:** `store_id, day_key`, `store_id, category_id`.

## 4.11 `adjustment_reasons`

| العمود       | النوع       | القيود                                       |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid        | PK                                           |
| `store_id`   | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL |
| `name`       | text        | NOT NULL                                     |
| `is_active`  | boolean     | default true                                 |
| `is_system`  | boolean     | default false                                |
| `created_at` | timestamptz | default `now()`                              |

**قيود:** UNIQUE (`store_id`, `name`).

## 4.12 `inventory_movements` (السجل المرجعي — Append-Only)

| العمود          | النوع       | القيود                                                                       |
| --------------- | ----------- | ---------------------------------------------------------------------------- | ------------- | ------------ | ----------- | ---- |
| `id`            | uuid        | PK                                                                           |
| `store_id`      | uuid        | FK → `stores.id` ON DELETE CASCADE, NOT NULL                                 |
| `product_id`    | uuid        | FK → `products.id` ON DELETE RESTRICT, NOT NULL                              |
| `sku`           | text        | لقطة                                                                         |
| `product_name`  | text        | لقطة                                                                         |
| `type`          | text        | CHECK IN (`'initial','in','out','sale','cancel','count','damage','return'`)  |
| `quantity`      | int         | NOT NULL — موقّع: + إضافة / − سحب                                            |
| `balance_after` | bigint      | NOT NULL                                                                     |
| `reason`        | text        |                                                                              |
| `note`          | text        | CHECK (char_length(note) <= 200)                                             |
| `ref_type`      | text        | `'sale'                                                                      | 'sale-cancel' | 'adjustment' | 'stocktake' | ...` |
| `ref_id`        | uuid        | بلا FK صارم (متعدد الأنواع) — فهرس عادي فقط                                  |
| `actor_id`      | uuid        | FK → `auth.users.id` — **هنا يتحقق التدقيق الحقيقي بعد المصادقة**            |
| `created_at`    | timestamptz | default `now()` — **يجب ضمان تفرّد الترتيب حتى تحت تزامن عالٍ؛ راجع §4.7.1** |
| `day_key`       | date        | NOT NULL                                                                     |

**فهارس:** `store_id, product_id, created_at DESC`, `store_id, day_key`, `store_id, type`, `ref_type, ref_id`.

**قاعدة عدم التعديل:** لا `UPDATE`/`DELETE` مسموح على هذا الجدول من طبقة التطبيق — Postgres RLS يمنع `UPDATE`/`DELETE` تماماً لغير `service_role` (يعادل "لا يُحذف منه شيء أبداً" في التوثيق الحالي).

### 4.7.1 Trigger: تحديث `products.quantity` تلقائياً من `inventory_movements`

هذا هو **الترجمة المباشرة** لثابت `applyMovement` في الكود الحالي — بدلاً من أن يكتب التطبيق `quantity` مباشرة، فإنه **يُدرج فقط في `inventory_movements`**، وTrigger على مستوى قاعدة البيانات هو من يحدّث `products.quantity`:

```sql
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger AS $$
DECLARE
  current_qty bigint;
  new_qty bigint;
BEGIN
  SELECT quantity INTO current_qty FROM products WHERE id = NEW.product_id FOR UPDATE;
  new_qty := current_qty + NEW.quantity;

  IF new_qty < 0 AND NEW.type NOT IN ('count', 'cancel') THEN
    RAISE EXCEPTION 'الكمية المتاحة غير كافية (المتاح %)', current_qty;
  END IF;

  NEW.balance_after := new_qty;
  UPDATE products SET quantity = new_qty, updated_at = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_inventory_movement
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- منع أي تعديل مباشر على quantity من خارج الـ Trigger
REVOKE UPDATE (quantity) ON products FROM authenticated;
```

`FOR UPDATE` هنا يقفل صف المنتج، فيمنع Race Condition بين بيعتين متزامنتين على نفس المنتج — وهي مشكلة **لم تكن موجودة أصلاً في IndexedDB** (معاملة واحدة لكل تبويب) لكنها **ستظهر حتماً** مع تعدد المستخدمين، ويجب معالجتها صراحة هنا.

## 4.13 Views محسوبة (بديل الحسابات في الذاكرة الحالية)

```sql
-- بديل customerLedgers() — رصيد كل عميل
CREATE VIEW customer_ledgers AS
SELECT
  c.id AS customer_id,
  c.store_id,
  COALESCE(SUM(s.due_minor) FILTER (WHERE s.status <> 'cancelled'), 0)
    - COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.customer_id = c.id), 0)
    AS balance_minor,
  COALESCE(SUM(s.total_minor) FILTER (WHERE s.status <> 'cancelled'), 0) AS purchases_minor,
  COUNT(s.id) FILTER (WHERE s.status <> 'cancelled') AS invoice_count,
  MAX(s.created_at) AS last_purchase_at
FROM customers c
LEFT JOIN sales s ON s.customer_id = c.id
GROUP BY c.id, c.store_id;

-- بديل stockStatus() لكل المنتجات دفعة واحدة
CREATE VIEW product_stock_status AS
SELECT id, store_id, quantity, low_stock_threshold,
  CASE
    WHEN quantity <= 0 THEN 'out'
    WHEN quantity <= low_stock_threshold THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM products WHERE is_active;
```

للتقارير الثقيلة (§`docs/future-backend.md` §8 — تقارير عبر فترات طويلة)، تُستخدم **Materialized Views** مجمّعة يومياً (`daily_sales_aggregates`) مع `REFRESH MATERIALIZED VIEW CONCURRENTLY` عبر Cron، بدل مسح كل السطور في كل طلب تقرير — وهذا يحل مسبقاً القيد الذي وثّقه الفريق بنفسه.

## 4.14 `settings`

نموذجان ممكنان: (أ) صفوف key/value مطابقة للحالي، أو (ب) عمود `jsonb` واحد لكل متجر. **نوصي بـ (ب)** لأن Postgres/Supabase تدعم `jsonb` بكفاءة وتبسّط القراءة إلى استعلام واحد بدل تجميع صفوف:

| العمود       | النوع       | القيود                                 |
| ------------ | ----------- | -------------------------------------- |
| `store_id`   | uuid        | PK, FK → `stores.id` ON DELETE CASCADE |
| `values`     | jsonb       | NOT NULL default `'{}'`                |
| `updated_at` | timestamptz | default `now()`                        |

القيم الافتراضية (`DEFAULT_SETTINGS` في الكود الحالي) تُطبَّق في طبقة التطبيق كدمج (`{...DEFAULT_SETTINGS, ...stored}`) تماماً كما هي الآن — لا حاجة لتغيير هذا النمط.

## 4.15 جداول اختيارية لمراحل لاحقة (غير مطلوبة في MVP)

| الجدول                                                 | الغرض                                                               | يعتمد على                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| `locations`                                            | فروع/مستودعات متعددة                                                | Phase مستقبلية — راجع `future-backend.md` §3 |
| `stock_levels(product_id, location_id, quantity)`      | مخزون لكل موقع                                                      | `locations`                                  |
| `suppliers`, `purchase_orders`, `purchase_order_items` | أوامر شراء                                                          | —                                            |
| `shifts`                                               | ورديات وصناديق نقد                                                  | المصادقة (Phase 3)                           |
| `sync_state`                                           | تتبّع تعارضات المزامنة بين الأجهزة (إن أُبقي على وضع Offline متقدم) | راجع §7                                      |

---

# 5. Migration Mapping

## 5.1 خريطة تحويل تفصيلية

| المكوّن الحالي (SkoonSPA)                       | المكوّن الجديد (Next.js + Supabase)                                                                | ملاحظات                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema.js` (IndexedDB stores)           | Supabase Postgres Migrations (`supabase/migrations/*.sql`)                                         | تحويل مباشر تقريباً؛ الفهارس الفريدة تصبح `UNIQUE` constraints                                                                           |
| `src/db/db.js` (`tx`, `get`, `put`...)          | Supabase JS Client (`@supabase/supabase-js`) + Server Actions                                      | استبدال كامل؛ الذرّية تنتقل من `IDBTransaction` إلى Postgres Transactions/RPC                                                            |
| `src/repositories/*.js`                         | `lib/data/*.ts` (Server-only) يستدعي RPC functions أو Supabase queries                             | نفس التقسيم المنطقي (products, sales, inventory, customers...) يُحافَظ عليه تماماً كطبقة                                                 |
| `completeSale()` (معاملة IndexedDB)             | Postgres Function `complete_sale(...)` عبر `supabase.rpc()`                                        | **يجب** أن تبقى Atomic — تُنفَّذ بالكامل داخل معاملة SQL واحدة على الخادم                                                                |
| `cancelSale()`                                  | Postgres Function `cancel_sale(...)`                                                               | نفس المنطق التعويضي، على الخادم                                                                                                          |
| `applyMovement()`                               | INSERT في `inventory_movements` + Trigger `apply_inventory_movement`                               | التنفيذ ينتقل من كود التطبيق إلى قاعدة البيانات نفسها (أقوى ضماناً)                                                                      |
| Hash Router (`router.js`, `routes.js`)          | Next.js App Router (`app/**/page.tsx`)                                                             | تحويل مباشر: كل مسار `#/x` → مجلد `app/x/page.tsx`                                                                                       |
| كل ملف HTML شاشة (`src/views/*.js`)             | React Server/Client Components (`app/**/page.tsx` + مكوّنات مصاحبة)                                | راجع تفصيل لكل شاشة في §5.2                                                                                                              |
| `src/components/*.js` (Vanilla DOM)             | React Components (`components/ui/*.tsx`) — يُفضَّل shadcn/ui كقاعدة                                | إعادة كتابة كاملة؛ لا يمكن نقل DOM يدوي مباشرة إلى JSX آلياً بجودة                                                                       |
| `src/state/store.js` (Pub/Sub بسيط)             | React Context + `useState`/`useReducer`، أو Zustand لحالة العميل العابرة فقط                       | بيانات العمل **لا تدخل** هذا المخزن أبداً — هي في Supabase/React Query                                                                   |
| — (لا يوجد Caching طبقة بيانات)                 | **TanStack Query / SWR** لإدارة حالة الخادم على العميل (Cache + Revalidation + Optimistic Updates) | إضافة جديدة ضرورية لتعويض غياب "قراءة محلية فورية" التي كانت توفرها IndexedDB                                                            |
| `src/validation/validators.js`                  | Zod schemas (`lib/validation/*.ts`) مشتركة بين Client Component وServer Action                     | نفس الحدود (طول النص، مدى الأرقام) تُترجَم لقواعد Zod + `CHECK` في Postgres (دفاع مزدوج)                                                 |
| `src/utils/money.js`                            | `lib/money.ts` (نفس المنطق حرفياً — كود عام لا يعتمد على DOM)                                      | **نقل شبه حرفي** — أفضل مثال على كود يُعاد استخدامه بلا تغيير جوهري                                                                      |
| `src/utils/dates.js` (`dayKey`, `monotonicISO`) | `lib/dates.ts`                                                                                     | `dayKey` يبقى بنفس المنطق؛ `monotonicISO` يُستبدل بـ `now()` + `id` تسلسلي من Postgres (`created_at` + `id` كافيان للترتيب في DB حقيقية) |
| `src/services/backup.js`                        | Server Action + Supabase Storage (تصدير) / RPC Import Validator (استيراد)                          | يبقى كخيار متاح للمستخدم، لكنه لم يعد خط الدفاع الوحيد ضد فقدان البيانات (النسخ الاحتياطي التلقائي على مستوى Supabase يغطي ذلك)          |
| `src/services/excel.js`                         | يبقى معالجة كاملة في المتصفح (Client Component) + استدعاء Server Action للحفظ الجماعي              | لا تغيير في تجربة "لا رفع ملفات خام للخادم"، فقط نتيجة المعالجة تُرسَل                                                                   |
| `src/services/reports.js` (تجميع في الذاكرة)    | Postgres Views/Materialized Views + `route.ts` API أو RPC                                          | تحسين أداء جوهري، خصوصاً مع البيانات المتراكمة                                                                                           |
| `src/services/print.js`                         | يبقى Client Component بالكامل (`window.print()` / مكتبة طباعة)                                     | لا تغيير جوهري                                                                                                                           |
| `src/services/pwa.js` + `sw.js`                 | `next-pwa`/Workbox + Service Worker مخصص لطابور المزامنة (Outbox)                                  | يتوسع دوره ليشمل مزامنة العمليات المعلّقة، لا فقط تخزين الأصول                                                                           |
| `src/services/images.js` (data URL)             | رفع مباشر إلى **Supabase Storage** + `image_url` في الصف                                           | يقلل حجم صفوف قاعدة البيانات جذرياً                                                                                                      |
| لا يوجد Backend/Auth                            | **Supabase Auth** (`@supabase/ssr`) + Middleware لحماية المسارات                                   | جديد بالكامل — راجع §6                                                                                                                   |
| لا يوجد صلاحيات                                 | **RLS Policies** لكل جدول + جدول `store_members.role`                                              | جديد بالكامل — راجع §6                                                                                                                   |
| IndexedDB كمخزن وحيد                            | IndexedDB **كمخزن Cache/Outbox فقط** (عبر Dexie.js أو `idb`) + Supabase كمصدر حقيقة                | تغيير جوهري في الدور، لا حذف كامل — راجع §7                                                                                              |

## 5.2 خريطة الشاشات إلى Next.js Routes

| الشاشة الحالية                     | Next.js Route                                                                           | نوع المكوّن المقترح                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `dashboard.js`                     | `app/(dashboard)/dashboard/page.tsx`                                                    | Server Component (KPIs من RPC/View) + Client widgets للرسوم                   |
| `pos.js`                           | `app/(dashboard)/pos/page.tsx`                                                          | Client Component بالكامل (تفاعلية عالية، عربة، بحث فوري، يجب أن تعمل Offline) |
| `products.js`                      | `app/(dashboard)/products/page.tsx`                                                     | Server Component لأول تحميل + Client للفلاتر (React Query)                    |
| `product-form.js` (`render`)       | `app/(dashboard)/products/new/page.tsx` و `app/(dashboard)/products/[id]/edit/page.tsx` | Client Component (نموذج) + Server Action للحفظ                                |
| `product-form.js` (`renderView`)   | `app/(dashboard)/products/[id]/page.tsx`                                                | Server Component                                                              |
| `inventory.js`                     | `app/(dashboard)/inventory/page.tsx`                                                    | Server + Client hybrid                                                        |
| `invoices.js`                      | `app/(dashboard)/invoices/page.tsx`                                                     | Server Component (قائمة) + Client فلاتر                                       |
| `invoice-detail.js`                | `app/(dashboard)/invoices/[id]/page.tsx`                                                | Server Component + Client لزر الإلغاء/الطباعة                                 |
| `customers.js` (`render`)          | `app/(dashboard)/customers/page.tsx`                                                    | Server Component                                                              |
| `customers.js` (`renderStatement`) | `app/(dashboard)/customers/[id]/page.tsx`                                               | Server Component (كشف الحساب View)                                            |
| `expenses.js`                      | `app/(dashboard)/expenses/page.tsx`                                                     | Server + Client hybrid                                                        |
| `reports.js`                       | `app/(dashboard)/reports/page.tsx`                                                      | Server Component يستدعي RPC/Views + Client لعناصر الفلترة والرسوم             |
| `backup.js`                        | `app/(dashboard)/settings/backup/page.tsx`                                              | Client Component (يستدعي Server Action)                                       |
| `settings.js`                      | `app/(dashboard)/settings/page.tsx`                                                     | Client Component (نموذج) + Server Action                                      |

---

# 6. Authentication Strategy

## 6.1 لماذا Supabase Auth تحديداً

النظام الحالي **بلا أي مصادقة**. الانتقال المباشر الأنسب هو **Supabase Auth** لأنه:

- يتكامل بشكل أصلي مع RLS عبر `auth.uid()` داخل السياسات، بلا طبقة وسيطة إضافية.
- يدعم البريد/كلمة المرور، Magic Link، وOAuth — مناسب لتطبيق تجاري صغير لا يحتاج IdP خارجي معقّد.
- حزمة `@supabase/ssr` مصمَّمة خصيصاً لـ Next.js App Router (قراءة/كتابة الجلسة عبر Cookies في Server Components وMiddleware).

## 6.2 نموذج الأدوار (مبني مباشرة على اقتراح الفريق في `future-backend.md`)

| الدور     | الصلاحيات                                                                           |
| --------- | ----------------------------------------------------------------------------------- |
| `owner`   | كل شيء + الإعدادات + حذف/تعطيل البيانات + إدارة الأعضاء                             |
| `manager` | كل العمليات + التقارير، بلا حذف بيانات نهائي                                        |
| `cashier` | البيع (`/pos`) وقراءة المنتجات فقط — **بلا رؤية التكلفة (`cost_minor`) أو الأرباح** |
| `stock`   | المخزون والتسويات فقط                                                               |

**القاعدة الحاسمة (مذكورة صراحة في `future-backend.md` وموروثة هنا حرفياً):**

> كل عملية حسّاسة تُتحقَّق **على الخادم عبر RLS/Postgres Functions**. إخفاء عنصر واجهة عن الكاشير تحسين لتجربة الاستخدام فقط، وليس إجراءً أمنياً — القرار الأمني الحقيقي دائماً في قاعدة البيانات.

## 6.3 مخطط RLS Policies (أمثلة تأسيسية)

```sql
-- تفعيل RLS على كل جدول بيانات عمل
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
-- ... وهكذا لكل جدول

-- دالة مساعدة: هل المستخدم عضو نشط في هذا المتجر؟
CREATE OR REPLACE FUNCTION is_store_member(target_store_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = target_store_id AND user_id = auth.uid() AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION member_role(target_store_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM store_members
  WHERE store_id = target_store_id AND user_id = auth.uid() AND is_active
  LIMIT 1;
$$;

-- القراءة: أي عضو نشط في المتجر
CREATE POLICY products_select ON products FOR SELECT
  USING (is_store_member(store_id));

-- الكتابة/الإنشاء: owner/manager/stock فقط (ليس cashier)
CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock'));

CREATE POLICY products_update ON products FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager', 'stock'));

-- حذف المنتج: ممنوع فعلياً على الجميع من العميل (يوازي "يُمنع إن كان مستخدماً في فاتورة")
-- لا توجد سياسة DELETE للمستخدمين العاديين؛ التعطيل هو المسار المتاح (UPDATE is_active)

-- inventory_movements: لا UPDATE ولا DELETE على الإطلاق من أي مستخدم عادي
CREATE POLICY movements_select ON inventory_movements FOR SELECT
  USING (is_store_member(store_id));
CREATE POLICY movements_insert ON inventory_movements FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock', 'cashier'));
-- عمداً: لا CREATE POLICY لـ UPDATE أو DELETE ⇒ محجوبة تماماً بحكم RLS الافتراضي (Deny by default)

-- عرض التكلفة للكاشير: يُحجب عبر View منفصلة بلا عمود cost_minor بدل الاعتماد على الواجهة فقط
CREATE VIEW products_cashier_view AS
  SELECT id, store_id, sku, barcode, name, category_id, unit, price_minor,
         tax_rate_bp, quantity, low_stock_threshold, image_url, is_active
  FROM products;
```

**ملاحظة تصميم:** إخفاء `cost_minor` عن الكاشير **لا يمكن** أن يتم عبر RLS على مستوى الصف وحده (RLS يفلتر صفوفاً لا أعمدة)؛ الحل الصحيح هو **View بأعمدة مقصورة** يُمنح `cashier` صلاحية القراءة عليها فقط، أو دالة RPC تُعيد الحقول المسموحة حسب الدور.

## 6.4 حماية المسارات في Next.js

```ts
// middleware.ts — تحقق الجلسة قبل الوصول لأي مسار محمي
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
```

طبقة إضافية على مستوى `layout.tsx` لكل مجموعة مسارات (`(dashboard)`) تتحقق من عضوية المتجر وتمرّر الدور عبر React Context للعميل — **للتحسين التجربي فقط**، والتحقق الحقيقي يبقى في RLS كما في §6.3.

---

# 7. Offline Strategy

## 7.1 المبدأ الأساسي: الحفاظ على "البيع لا يتوقف أبداً" كخط أحمر

الفريق وثّق بوضوح أن **البيع نفسه** هو الوظيفة الوحيدة التي **يجب** أن تبقى تعمل بلا اتصال — هذا "جوهر المنتج" بتعبير `future-backend.md`. عليه، استراتيجية Offline بعد الترحيل تُبنى حول نقطة البيع (`/pos`) تحديداً، لا حول التطبيق كله بنفس الدرجة.

## 7.2 الطبقات بعد الترحيل

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Client (المتصفح)                                │
│  ┌───────────────┐   ┌─────────────────────────────────┐ │
│  │ IndexedDB      │   │ Service Worker                   │ │
│  │ (عبر Dexie.js) │   │ - Cache-first للأصول (كما هو)    │ │
│  │ - Cache قراءة  │   │ - Background Sync API             │ │
│  │ - Outbox كتابة │   │   (يعيد محاولة الطلبات المعلّقة)  │ │
│  └───────┬────────┘   └────────────────┬──────────────────┘ │
│          │  Sync Engine (يُشغَّل عند العودة للاتصال)        │
└──────────┼─────────────────────────────┼─────────────────┘
           │                              │
           ▼                              ▼
   ┌────────────────────────────────────────────┐
   │   Supabase PostgreSQL (مصدر الحقيقة الوحيد)  │
   └────────────────────────────────────────────┘
```

### 7.2.1 Local Cache (قراءة)

- عند كل اتصال ناجح: المنتجات النشطة، الفئات، الإعدادات، وقائمة عملاء مختصرة تُخزَّن في IndexedDB (عبر **Dexie.js** بدل الطبقة اليدوية الحالية — يقلّل الكود المكتوب يدوياً بلا فقد قدرات).
- شاشة `/pos` تقرأ **من IndexedDB أولاً دائماً** (Cache-first حقيقي)، وتُحدَّث بالخلفية عبر React Query `staleTime`/`refetchOnReconnect`.

### 7.2.2 Offline Queue (كتابة) — Outbox Pattern

كل عملية كتابة أثناء انقطاع الاتصال (بيع، تسوية مخزون، دفعة) تُكتب فوراً في جدول محلي `outbox` بصيغة تشبه `future-backend.md` §1 حرفياً:

```ts
interface OutboxEntry {
  id: string;              // uuid محلي، يصبح PK فعلي عند الإرسال (Idempotency Key)
  storeId: string;
  operation: 'complete_sale' | 'record_payment' | 'record_adjustment' | ...;
  payload: object;          // نفس شكل مدخلات RPC المقابلة
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}
```

الواجهة **تتفاءل فوراً (Optimistic UI)**: الفاتورة تظهر "مكتملة محلياً" وتُطبع فوراً، بينما تُزامَن بالخلفية.

### 7.2.3 Sync Engine

عند عودة الاتصال (`online` event + Background Sync API):

1. قراءة `outbox` بترتيب `createdAt`.
2. لكل إدخال: استدعاء RPC المقابلة على Supabase **بنفس `id` المحلي كـ Idempotency Key** (`ON CONFLICT (id) DO NOTHING` في الدالة) لمنع الإدراج المكرر عند إعادة المحاولة.
3. عند النجاح: حذف الإدخال من `outbox`، وتحديث الـ Cache المحلي بالنتيجة الفعلية من الخادم (خصوصاً `sales.number` النهائي — راجع §7.3).
4. عند الفشل (تعارض حقيقي لا شبكي): وضع الحالة `failed` وعرضها للمستخدم صراحة (لا إخفاء صامت).

### 7.3 نقطة الاحتكاك الحرجة: ترقيم الفواتير أوفلاين

في IndexedDB الحالي، `invoiceNextNumber` عدّاد محلي بسيط لأن الجهاز الوحيد هو مصدر الحقيقة. بعد الترحيل، **لا يمكن** لجهازين أوفلاين حجز نفس الرقم التالي دون تنسيق. الحل المقترح (المتوافق مع اقتراح `future-backend.md` §1 حرفياً):

- كل جهاز/كاشير يحصل على **بادئة مخصصة** عند تسجيل الدخول (`INV-A-2026-00001`, `INV-B-2026-00001`)، مبنية من `store_members.id` أو رمز جهاز قصير.
- عند العودة للاتصال، الفاتورة تُدرج بهذا الرقم المؤقت الفريد أصلاً (لا تعارض ممكن لأن البادئة فريدة لكل مصدر).
- **بديل أبسط لِـ MVP:** تعطيل البيع الآجل/الطباعة الرسمية أثناء الانقطاع في وضع "تعدد الأجهزة النشط"، والاكتفاء بأرقام مؤقتة محلية (`TEMP-...`) تُستبدل برقم رسمي فور المزامنة إن كان الحجم التشغيلي يسمح بذلك. **القرار النهائي بين الخيارين يُتَّخذ في Phase 9 (راجع الخارطة) بعد قياس حجم الاستخدام الفعلي متعدد الأجهزة.**

### 7.4 Conflict Resolution — يبني مباشرة على تصنيف الفريق في `future-backend.md`

| نوع البيانات                         | استراتيجية التعارض                                                                                                                | السبب                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **الفواتير (`sales`, `sale_items`)** | لا تعارض ممكن بنيوياً — إضافة فقط (Append-only)، لا تعديل بعد الإنشاء إلا عبر إلغاء (عملية جديدة لا كتابة فوق القديم)             | الفاتورة غير قابلة للتغيير أصلاً في التصميم الحالي                      |
| **المخزون (`inventory_movements`)**  | لا تُزامَن `quantity` كقيمة مطلقة أبداً؛ تُزامَن **الحركات فقط**، ويُعاد احتساب الكمية من مجموعها على الخادم (عبر Trigger §4.7.1) | القيمة المطلقة تتضارب حتماً بين جهازين، الحركات لا تتضارب — فقط تُرتَّب |
| **المنتجات/العملاء**                 | Last-Write-Wins مع عمود `version` (int, يُزاد بكل تحديث) لكشف التعارض وعرضه للمستخدم إن حدث فرق فعلي                              | تعديلات نادرة ومتزامنة نادراً جداً، لا تستحق تعقيد CRDT                 |
| **الإعدادات**                        | Last-Write-Wins بسيط                                                                                                              | مستخدم واحد (عادة المالك) يعدّلها                                       |

### 7.5 ما الذي **لا يحتاج** طابور مزامنة إطلاقاً

يبقى تماماً كما هو دون تغيير جوهري (منطق `offline-strategy.md` الحالي صالح 1:1 لهذه الطبقة):

- **Cache Storage للأصول الثابتة** (JS/CSS/خطوط/أيقونات) — نفس استراتيجية Cache-first، عبر `next-pwa`/Workbox بدل `sw.js` اليدوي.
- **الطباعة** — محلية بالكامل دوماً.
- **معالجة Excel** — تبقى بالكامل في المتصفح؛ فقط نتيجة الاستيراد النهائية تُرسَل عبر Server Action (وتدخل نفس منطق Outbox إن كانت أوفلاين).

---

# 8. Next.js Architecture

## 8.1 القرارات المعمارية

- **App Router** حصراً (لا Pages Router).
- **Server Components افتراضياً** لكل شاشة قراءة (Dashboard, Reports, Invoices List, Customer Statement) — تقليل JS المُرسَل للعميل، واستعلام Supabase مباشرة من الخادم بمفتاح `service_role` مقيَّد أو بجلسة المستخدم عبر `@supabase/ssr`.
- **Client Components** فقط حيث تتطلب الحالة تفاعلاً فورياً بلا Round-trip: `/pos` (السلة)، النماذج (`product-form`, `settings`)، أي مكوّن يعتمد على Offline Cache.
- **Server Actions** لكل عملية كتابة بدل API Routes حيثما أمكن (أبسط، ونوع آمن من طرف إلى طرف مع TypeScript)؛ **API Routes تبقى فقط** لنقاط تكامل خارجية محتملة (Webhooks مستقبلية، تصدير ملفات).
- **TanStack Query** على العميل لإدارة حالة الخادم في الشاشات التفاعلية (خصوصاً `/pos`)، متكامل مع طبقة Outbox/IndexedDB (§7).
- **Zod** للتحقق، مُشترَك بين Server Action والنموذج على العميل (نفس مصدر الحقيقة لقواعد `validators.js` الحالية).
- **shadcn/ui + Tailwind** لطبقة المكوّنات، مع دعم **RTL كامل** (`dir="rtl"` على `<html>`، وخط Tajawal يُنقَل كما هو عبر `next/font/local`).

## 8.2 هيكل المجلدات المقترح

```
skoon-web/
├── app/
│   ├── layout.tsx                    dir="rtl" lang="ar" + الخطوط + Providers
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                   تسجيل دخول (Supabase Auth UI أو نموذج مخصص)
│   ├── onboarding/
│   │   └── page.tsx                   إنشاء أول متجر (store) بعد أول تسجيل دخول
│   │
│   └── (dashboard)/                   مجموعة مسارات محمية (middleware.ts يتحقق من الجلسة)
│       ├── layout.tsx                  Shell: Sidebar + Topbar + StoreProvider (يوفّر role/storeId)
│       │
│       ├── dashboard/
│       │   └── page.tsx                Server Component — KPIs من Views
│       │
│       ├── pos/
│       │   ├── page.tsx                Client Component — نقطة البيع
│       │   └── _components/
│       │       ├── cart.tsx
│       │       ├── product-search.tsx
│       │       └── payment-panel.tsx
│       │
│       ├── products/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   ├── [id]/page.tsx
│       │   ├── [id]/edit/page.tsx
│       │   └── _components/product-table.tsx
│       │
│       ├── inventory/
│       │   ├── page.tsx
│       │   └── _components/movement-form.tsx
│       │
│       ├── invoices/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       │
│       ├── customers/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       │
│       ├── expenses/
│       │   └── page.tsx
│       │
│       ├── reports/
│       │   └── page.tsx
│       │
│       └── settings/
│           ├── page.tsx
│           ├── backup/page.tsx
│           └── members/page.tsx        إدارة أعضاء المتجر والأدوار (جديد)
│
├── actions/                            Server Actions — طبقة الكتابة (تعادل repositories الحالية)
│   ├── sales.ts                        completeSale, cancelSale
│   ├── products.ts
│   ├── inventory.ts
│   ├── customers.ts
│   ├── expenses.ts
│   └── settings.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   عميل Supabase من طرف المتصفح
│   │   ├── server.ts                    عميل Supabase من طرف الخادم (Cookies)
│   │   └── middleware.ts
│   ├── money.ts                        نقل شبه حرفي من utils/money.js
│   ├── dates.ts                         نقل شبه حرفي من utils/dates.js
│   ├── validation/
│   │   ├── product.ts (Zod)
│   │   ├── sale.ts
│   │   └── customer.ts
│   ├── offline/
│   │   ├── db.ts                        تعريف Dexie (بديل db/schema.js)
│   │   ├── outbox.ts                     منطق طابور المزامنة
│   │   └── sync-engine.ts
│   └── types/
│       └── database.types.ts            أنواع مولَّدة تلقائياً بـ `supabase gen types typescript`
│
├── components/
│   ├── ui/                              مكوّنات shadcn/ui (Button, Card, Table, Dialog...)
│   └── shared/                          مكوّنات مشتركة (EmptyState, StockBadge, CurrencyDisplay...)
│
├── hooks/
│   ├── use-cart.ts
│   ├── use-online-status.ts
│   └── use-store-role.ts
│
├── middleware.ts                        حماية مسارات (dashboard)
├── public/
│   ├── sw.js                            Service Worker (Workbox-generated أو مخصص)
│   ├── manifest.webmanifest
│   └── fonts/                           Tajawal (نُقلت كما هي)
│
├── supabase/
│   ├── migrations/                       ملفات SQL مرقّمة زمنياً
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_triggers.sql
│   │   └── 0004_views.sql
│   ├── functions/                        Edge Functions (إن احتيج، مثل تصدير نسخة احتياطية ثقيلة)
│   └── seed.sql
│
└── tests/
    ├── unit/                              Vitest — نقل منطقي لـ tests/*.test.js الحالية
    └── e2e/                                Playwright — بديل tools/screenshot.mjs وسيناريو انقطاع الشبكة
```

## 8.3 مثال Server Action لعملية البيع (يوضّح الذرّية على الخادم)

```ts
// actions/sales.ts
"use server";

export async function completeSale(input: CompleteSaleInput) {
  const parsed = completeSaleSchema.parse(input); // Zod — نفس حدود validators.js
  const supabase = createServerActionClient();

  const { data, error } = await supabase.rpc("complete_sale", {
    p_store_id: parsed.storeId,
    p_lines: parsed.lines,
    p_customer_id: parsed.customerId,
    p_discount: parsed.discount,
    p_payment_type: parsed.paymentType,
    p_paid_minor: parsed.paidMinor,
    p_idempotency_key: parsed.idempotencyKey, // من الـ Outbox — يمنع التكرار
  });

  if (error) throw new SaleError(error.message);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return data;
}
```

`complete_sale` نفسها **دالة Postgres (`plpgsql`, `SECURITY DEFINER`)** تكرر خطوات `completeSale()` الحالية حرفياً (تحقق → حساب مجاميع → حجز رقم → إدراج فاتورة وسطور → إدراج حركات مخزون) **داخل معاملة SQL واحدة**، فتحافظ بدقة على نفس ضمان "الكل أو لا شيء" المطلوب في §1.3.

---

# 9. Migration Roadmap

## Phase 1 — Analysis _(هذا التقرير)_

- **الهدف:** فهم كامل للنظام الحالي وتوثيق كل قاعدة عمل ضمنية قبل أي سطر كود.
- **الملفات المتأثرة:** لا شيء يُعدَّل — قراءة فقط لكامل `SkoonSPA/`.
- **المخاطر:** تفويت قاعدة عمل غير موثَّقة صراحة في الكود (خُفِّف عبر قراءة كل repository سطراً بسطر + الاستفادة من `docs/*.md` الموجودة أصلاً).
- **ناتج المرحلة:** هذا التقرير، معتمَد من الفريق قبل الانتقال لـ Phase 2.

## Phase 2 — Database

- **الهدف:** إنشاء مشروع Supabase، تطبيق كل الجداول والفهارس والقيود (§4)، الـ Triggers (§4.7.1)، والـ Views (§4.13)، وتوليد الأنواع (`database.types.ts`).
- **الملفات المتأثرة:** `supabase/migrations/*.sql` (جديدة بالكامل).
- **المخاطر:** نسيان قيد `CHECK` أو فهرس فريد يقابل سلوكاً ضمنياً في IndexedDB (مثل تفرّد `barcode` مع السماح بـ NULL متعدد) — يُخفَّف بمراجعة كل جدول مقابل `docs/data-model.md` الأصلي بندًا بندًا.
- **ناتج المرحلة:** قاعدة بيانات فارغة تعمل، تمرّ بها اختبارات قيود أساسية (محاولة إدراج SKU مكرر تفشل، إلخ).

## Phase 3 — Authentication

- **الهدف:** Supabase Auth + `store_members` + RLS الأساسية (§6) + Middleware حماية المسارات + شاشة Onboarding لإنشاء أول متجر.
- **الملفات المتأثرة:** `middleware.ts`, `app/login/`, `app/onboarding/`, `supabase/migrations/0002_rls_policies.sql`.
- **المخاطر:** RLS مُعقَّد بما يكفي ليُنشئ ثغرات صامتة (سياسة INSERT ناقصة تسمح بإدراج بلا `store_id` صحيح) — يُخفَّف بكتابة اختبارات RLS آلية (Phase مبكرة، ليس بعد التسليم).
- **ناتج المرحلة:** تسجيل دخول فعلي، كل مستخدم يرى بيانات متجره فقط، الأدوار الأربعة مُطبَّقة.

## Phase 4 — Products

- **الهدف:** ترحيل شاشات المنتجات والفئات كاملة: قائمة، نموذج إضافة/تعديل، بحث، رفع صور إلى Storage.
- **الملفات المتأثرة:** `app/(dashboard)/products/**`, `actions/products.ts`, `lib/validation/product.ts`.
- **المخاطر:** فقدان دقة البحث (`nameLower`) — يُخفَّف باستخدام فهرس نصي Postgres (`pg_trgm`) بدل عمود مساعد.
- **ناتج المرحلة:** إدارة منتجات كاملة الوظائف على Supabase، مع بيانات تجريبية مطابقة لبيانات `seed.js` الأصلية للمقارنة اليدوية.

## Phase 5 — Customers

- **الهدف:** قائمة عملاء، كشف حساب، تسجيل دفعات، `customer_ledgers` View.
- **الملفات المتأثرة:** `app/(dashboard)/customers/**`, `actions/customers.ts`.
- **المخاطر:** خطأ في منطق الرصيد التراكمي عند الترحيل (فرق بين `sales.due_minor` وقت الإلغاء) — يُخفَّف باختبار وحدة يقارن نتيجة `customer_ledgers` مع محاكاة يدوية لعشرات السيناريوهات (بيع، إلغاء جزئي التأثير، دفعة زائدة).
- **ناتج المرحلة:** كشف حساب مطابق رقمياً لما ينتجه `customerStatement()` الحالي على نفس البيانات.

## Phase 6 — Inventory

- **الهدف:** حركات المخزون، Trigger `apply_inventory_movement`، تسويات، جرد، أسباب تسوية.
- **الملفات المتأثرة:** `app/(dashboard)/inventory/**`, `supabase/migrations/0003_triggers.sql`, `actions/inventory.ts`.
- **المخاطر:** **الأعلى في كل الخارطة** — قفل الصف (`FOR UPDATE`) في Trigger تحت تزامن عالٍ قد يُنتج Deadlocks إن استُدعي من مسارات متعددة بترتيب مختلف على أكثر من جدول في نفس المعاملة. يُخفَّف بحصر ترتيب الأقفال (دائماً `products` قبل غيره) واختبار حِمل (Load test) لعمليات بيع متزامنة على نفس المنتج قبل التسليم.
- **ناتج المرحلة:** `products.quantity` مضمونة الاتساق مع `Σ(inventory_movements.quantity)` تحت أي تزامن، بإثبات اختباري.

## Phase 7 — Invoices (Sales/POS)

- **الهدف:** أعقد وأهم مرحلة وظيفياً — `/pos`، `complete_sale`/`cancel_sale` RPC، الطباعة، البيوع المعلّقة، **وأول تفعيل فعلي لطبقة Offline/Outbox** (§7).
- **الملفات المتأثرة:** `app/(dashboard)/pos/**`, `app/(dashboard)/invoices/**`, `lib/offline/**`, دالة `complete_sale`/`cancel_sale` في SQL.
- **المخاطر:**
  - ترقيم الفواتير المتزامن (§7.3) — الأخطر وظيفياً لأنه يمسّ الالتزام الضريبي/المحاسبي.
  - فقدان ضمان الذرّية إن نُفِّذت الخطوات من العميل بدل RPC واحدة — **يجب فرض** أن كل مسار كتابة يمرّ عبر Server Action → RPC، لا استعلامات Supabase مباشرة متعددة من العميل لهذه العملية تحديداً.
- **ناتج المرحلة:** نقطة بيع تعمل أونلاين وأوفلاين، بفواتير متسلسلة الأرقام بلا تكرار أو فجوات غير مُفسَّرة، وسلوك إلغاء مطابق للأصل.

## Phase 8 — Reports

- **الهدف:** تقارير مبيعات/أرباح/مخزون/عملاء عبر Views/Materialized Views بدل التجميع في الذاكرة.
- **الملفات المتأثرة:** `app/(dashboard)/reports/**`, `supabase/migrations/0004_views.sql`.
- **المخاطر:** فروق تقريب دقيقة بين تجميع JS القديم (`allocateProportionally`) وتجميع SQL — يُخفَّف بنقل نفس دوال التقريب (`roundHalfUp`) كدوال Postgres (`plpgsql`) بدل الاعتماد على تقريب SQL الافتراضي.
- **ناتج المرحلة:** كل تقرير في القائمة الحالية (`reports.js`) يعطي نفس الأرقام تماماً على نفس مجموعة بيانات الاختبار.

## Phase 9 — Offline Sync

- **الهدف:** تصليب طبقة Outbox/Sync Engine الكاملة (§7)، معالجة التعارضات، حل نهائي لترقيم الفواتير متعدد الأجهزة (البادئة لكل جهاز مقابل أرقام مؤقتة).
- **الملفات المتأثرة:** `lib/offline/sync-engine.ts`, `public/sw.js` (Background Sync).
- **المخاطر:** حالات حافة (Edge cases) في تعارض المزامنة يصعب اختبارها يدوياً — يُخفَّف بمحاكاة انقطاع شبكة آلية (Playwright + CDP، كما فعل الفريق أصلاً في اختباراته الحالية لـ Service Worker) مع سيناريوهات متعددة الأجهزة.
- **ناتج المرحلة:** تجربة Offline تطابق أو تتفوق على `docs/offline-strategy.md` الأصلي، موثَّقة رسمياً بنفس مستوى التفصيل.

## Phase 10 — Deployment

- **الهدف:** نشر إنتاجي (Vercel للـ Next.js + Supabase Production Project)، فحوص PWA، CSP، النسخ الاحتياطي التلقائي على مستوى Supabase (Point-in-Time Recovery)، مراقبة (Sentry/Logs).
- **الملفات المتأثرة:** إعدادات بيئة (`.env.production`)، `next.config.js` (Headers/CSP)، إعدادات Supabase (Backups, Rate Limits).
- **المخاطر:** فقدان قائمة فحص النشر التي وثّقها الفريق أصلاً في `offline-strategy.md` (HTTPS، ترويسة `Service-Worker-Allowed`، MIME الصحيح للـ manifest، عدم تخزين `sw.js` بكاش HTTP طويل) — يُخفَّف بإعادة استخدام نفس القائمة حرفياً كـ Checklist نشر جديد (§10.5).
- **ناتج المرحلة:** نظام حي، متعدد المستخدمين، بمصادقة وصلاحيات حقيقية، يعمل أونلاين وأوفلاين، بنسخ احتياطي مُدار.

---

# 10. Risks & Recommendations

## 10.1 مخاطر فقدان البيانات

| الخطر                                            | الوصف                                                                                                       | التوصية                                                                                                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| هجرة أولية خاطئة                                 | نقل بيانات تجريبية/إنتاجية موجودة من IndexedDB إلى Supabase بخطأ في التحويل (خصوصاً القيم المالية والـ IDs) | أداة هجرة مخصّصة تقرأ ملف النسخة الاحتياطية الحالي (`docs/data-model.md` §"بنية ملف النسخة") وتتحقق من كل صف عبر نفس Zod schemas المستخدمة في الكتابة، مع تقرير فروق قبل أي `COMMIT` فعلي |
| Trigger معطوب يفسد `quantity` بصمت               | خطأ منطقي في `apply_inventory_movement` قد يمرّ دون رفع استثناء في بعض المسارات                             | اختبار يقارن `products.quantity` مقابل `SUM(inventory_movements.quantity)` كـ Assertion دورية (يمكن كـ Postgres `CHECK` على View أو فحص CI مجدوَل)                                        |
| فقدان اللقطات التاريخية عند إعادة الهيكلة لاحقاً | إغراء "تطبيع" `sale_items` لاحقاً بربطها حياً بـ `products` بدل الاحتفاظ بأعمدة اللقطة                      | توثيق صريح في الكود/الـ Schema (تعليقات SQL) يمنع هذا التغيير مستقبلاً — نفس فلسفة `docs/data-model.md` الحالية                                                                           |

## 10.2 مخاطر التزامن

| الخطر                                      | الوصف                                                                               | التوصية                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Race condition على بيع منتج واحد من جهازين | بيعتان متزامنتان لآخر وحدة من منتج                                                  | `FOR UPDATE` في Trigger (§4.7.1) — مُطبَّق من التصميم، لكن يحتاج اختبار حِمل حقيقي في Phase 6 |
| تعارض ترقيم الفواتير أوفلاين               | جهازان يحجزان نفس الرقم أثناء الانقطاع                                              | بادئة لكل جهاز أو أرقام مؤقتة (§7.3) — قرار يُحسم بعد قياس حجم الاستخدام الفعلي               |
| Deadlock بين معاملات متعددة الجداول        | ترتيب أقفال غير ثابت بين `complete_sale` وعمليات أخرى تلمس `products` و`sales` معاً | فرض ترتيب ثابت للأقفال في كل الدوال (`products` أولاً دوماً) وتوثيقه كقاعدة معمارية إلزامية   |

## 10.3 مشاكل الأداء

| الخطر                                  | الوصف                                                                                                                          | التوصية                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| تقارير بطيئة مع نمو البيانات           | نفس القيد الذي وثّقه الفريق أصلاً (`future-backend.md` §8) لكنه سينتقل من "مسح IndexedDB" إلى "استعلام SQL ثقيل" إن لم يُعالَج | Materialized Views مجمّعة يومياً (§4.13) من اليوم الأول، لا كتحسين لاحق                                       |
| N+1 queries في React Server Components | جلب فاتورة ثم سطورها ثم بيانات العميل في استدعاءات منفصلة متتالية                                                              | استخدام `select` المتداخل في Supabase (`sales.select('*, sale_items(*), customers(*)')`) بدل استعلامات منفصلة |
| حجم Bundle أعلى من SPA يدوية خفيفة     | React + shadcn/ui + TanStack Query أثقل من DOM يدوي بلا مكتبات                                                                 | الاعتماد الكامل على Server Components حيث ممكن (§8.1) لإبقاء JS المُرسَل للعميل قريباً من الحد الأدنى         |

## 10.4 مشاكل الأمان

| الخطر                                                                 | الوصف                                                                                            | التوصية                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| اعتماد على إخفاء واجهة فقط لحجب التكلفة عن الكاشير                    | خطأ مطابق تماماً لما حذّر منه الفريق أصلاً في `security-review.md` §7.1 عن "PIN محلي ليس مصادقة" | View مقصورة الأعمدة + RPC (§6.3) — لا الاعتماد على React Conditional Rendering وحده                                                                                                     |
| توسّع نطاق `SECURITY DEFINER` بلا ضبط                                 | دوال RPC بصلاحيات مرتفعة قد تُستغَل إن لم تتحقق من `store_id`/الدور داخلياً                      | كل دالة `SECURITY DEFINER` تبدأ بالتحقق الصريح من `is_store_member`/`member_role` قبل أي عملية، حتى لو كانت RLS مفعّلة أيضاً (دفاع مزدوج)                                               |
| تسريب بيانات بين المتاجر عبر استعلام ناقص الفلترة في Server Component | نسيان `WHERE store_id = ...` في استعلام يدوي بدل الاعتماد الكامل على RLS                         | الاعتماد **دوماً** على RLS كخط الدفاع الأساسي (وليس فلترة يدوية في كل استعلام)، مع اختبار: مستخدم من متجر A لا يستطيع قراءة أي صف من متجر B حتى لو أُسقطت فلاتر `WHERE` عمداً في اختبار |
| CSP الحالية (`connect-src 'self'`) تحتاج تحديثاً لتشمل نطاق Supabase  | التطبيق الحالي لا يصدر أي طلب خارجي؛ التطبيق الجديد **يجب** أن يتواصل مع Supabase                | تحديث CSP بدقة لتشمل فقط نطاق مشروع Supabase (`https://<project>.supabase.co`)، لا `connect-src *`                                                                                      |

## 10.5 قائمة فحص نشر — امتداد لقائمة الفريق الأصلية

يبقى كل بند في `docs/offline-strategy.md` §"قائمة فحص النشر" صالحاً حرفياً (HTTPS، ترويسة `Service-Worker-Allowed`، MIME الصحيح للـ manifest، عدم تخزين `sw.js` بكاش HTTP طويل، CSP بـ `frame-ancestors 'none'`)، مع إضافات إلزامية جديدة:

- تفعيل **Point-in-Time Recovery** على مشروع Supabase الإنتاجي قبل أول بيانات حقيقية.
- مراجعة **كل** سياسة RLS بعملية "محاولة اختراق" يدوية: تسجيل دخول كـ `cashier` ومحاولة قراءة/كتابة كل جدول يُفترض أنه محظور عليه.
- التأكد من أن مفاتيح `service_role` **لا تصل إطلاقاً** إلى الحزمة المُرسَلة للعميل (فحص `next build` output).
- اختبار سيناريو انقطاع شبكة كامل على `/pos` في بيئة Staging قبل أي إطلاق فعلي (نفس منهج الاختبار الآلي الذي بناه الفريق أصلاً بقطع الشبكة عبر CDP).

---

# 11. Final Deliverable — خطة التنفيذ النهائية

## 11.1 الترتيب الصحيح للتنفيذ (يجب الالتزام به بهذا التسلسل)

```
1.  إعداد مشروع Supabase + مشروع Next.js فارغ (Scaffolding فقط، بلا منطق عمل)
2.  Phase 2: Database — تطبيق كل الجداول/القيود/الفهارس (بلا Triggers بعد)
3.  Phase 3: Authentication — تسجيل دخول + store_members + RLS الأساسية
4.  Phase 2 (تكملة): Triggers (§4.7.1) + Views (§4.13) — بعد أن تصبح الأدوار موجودة لاختبار RLS عليها فعلياً
5.  Phase 4: Products — أول شاشة عمل كاملة، تُستخدم كنموذج مرجعي (Reference Implementation) لبقية الشاشات
6.  Phase 6: Inventory — قبل Sales لأن complete_sale يعتمد على apply_inventory_movement جاهزة ومختبَرة
7.  Phase 5: Customers — قبل Sales لأن complete_sale يحتاج customer_id/ledger جاهزين
8.  Phase 7: Invoices/POS — أعقد مرحلة، تُبنى فوق كل ما سبق
9.  Phase 8: Reports — تعتمد على بيانات مبيعات/مخزون حقيقية للاختبار
10. Phase 9: Offline Sync — تُفعَّل على POS فقط أولاً، ثم تُوسَّع إن احتيج
11. Phase 10: Deployment — نشر تدريجي (Staging ثم Production محدود ثم عام)
```

**ملاحظة على الترتيب:** هذا يختلف قليلاً عن ترقيم الأقسام في هذا التقرير (§9) لأن الاعتماديات الفعلية بين المكوّنات (Inventory وCustomers قبل Sales) تفرض إعادة ترتيب التنفيذ رغم أن الترقيم في الخارطة يتبع تسلسل قيمة الأعمال (Business Value) لا تسلسل الاعتماد التقني البحت.

## 11.2 أفضل الممارسات الحديثة الواجب اتباعها طوال التنفيذ

- **Type Safety من طرف إلى طرف:** `supabase gen types typescript` بعد كل تغيير Schema → Zod schemas مبنية على نفس الأنواع → لا `any` في طبقة البيانات.
- **RLS أولاً، لا لاحقاً:** كل جدول جديد يُفعَّل عليه RLS **في نفس الـ Migration** التي تُنشئه، لا كخطوة لاحقة منفصلة — منع نافذة زمنية غير آمنة.
- **Server Actions للكتابة، Server Components للقراءة الأولية، TanStack Query للتفاعل بعد التحميل الأول** — لا خلط عشوائي بين الأنماط الثلاثة.
- **كل منطق مالي/مخزوني حسّاس يعيش في Postgres Functions، لا في Server Actions فقط** — الدرس المستفاد مباشرة من فلسفة الكود الحالي: "لا يوجد مسار آخر يكتب `quantity`".
- **اختبارات الوحدة لكل RPC مالي قبل ربطها بواجهة** (نقل مباشر لفلسفة `tests/money.test.js`, `tests/sales.test.js` الحالية إلى `pgTAP` أو اختبارات Vitest تستدعي Supabase محلي عبر Supabase CLI).
- **لا Migration إلى الإنتاج بلا نسخة `down` أو خطة Rollback موثّقة**، حتى لو Supabase توفر PITR كخط دفاع أخير.
- **مراجعة كل RLS Policy جديدة بواسطة شخص غير كاتبها** قبل النشر — RLS أخطاء صامتة بطبيعتها.

## 11.3 معايير القبول (Definition of Done) على مستوى المشروع كله

الترحيل يُعتبر مكتملاً حين:

1. كل شاشة في §2.2 لها مقابل عامل بالكامل في §5.2 بنفس الوظائف أو أفضل.
2. `complete_sale`/`cancel_sale` يعطيان نفس النتائج الرقمية على مجموعة بيانات اختبار مطابقة لما تنتجه `repositories/sales.js` الحالية (اختبار مقارنة مباشر).
3. `/pos` يعمل بلا اتصال لسيناريو بيع كامل (بحث → سلة → دفع → طباعة) ويُزامَن بنجاح عند عودة الاتصال.
4. اختبار RLS شامل: مستخدم بدور `cashier` لا يستطيع قراءة `cost_minor` ولا الوصول لأي جدول من متجر آخر، بأي وسيلة.
5. تقارير §Phase 8 تطابق أرقام النظام القديم على نفس البيانات ضمن هامش خطأ صفري (المال دقيق دوماً، لا تقريب تراكمي).
6. قائمة فحص النشر (§10.5) مكتملة بالكامل قبل أي إطلاق للمستخدمين الفعليين.

---

**نهاية التقرير.** لا يوجد كود منفَّذ في هذه المرحلة كما طُلب — هذا تحليل وخطة فقط. الخطوة التالية المقترحة: اعتماد هذا التقرير، ثم البدء بـ Phase 2 (Database) فعلياً وفق الترتيب في §11.1.
