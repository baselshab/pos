"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Badge, Button, EmptyState, DetailRow, ToggleField, FileDrop } from "@/components/ui";
import { DataTable, ThumbCell } from "@/components/table";
import { toastOk, toastError } from "@/components/feedback/Toast";
import { validateProduct, LIMITS, validateAdjustment, parseQuantity, bpToPercent } from "@/lib/validation";
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_MOVEMENTS,
  MOCK_SETTINGS,
  MOCK_REASONS,
  stockStatus,
  STOCK_LABEL,
  STOCK_TONE,
  STOCK_STATUS,
  createProduct,
  updateProduct,
  getProduct,
  listCategories,
  createCategory,
  movementsForProduct,
  applyMovement,
  recordAdjustment,
  recordStocktake,
  MOVEMENT,
  MOVEMENT_LABEL,
} from "@/lib/mock-products";

const UNITS = ["قطعة", "عبوة", "كيس", "علبة", "كرتون", "حزمة", "كجم", "جرام", "لتر", "متر"];

const TAX_OPTIONS = [
  { value: "0", label: "معفى (0%)" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "14", label: "14%" },
  { value: "15", label: "15% - ضريبة القيمة المضافة" },
];

function formatAmount(minor: number): string {
  return (minor / 100).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ltr(text: string | number) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "var(--font-num)" }}>
      {text}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 بايت";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت", "تيرابايت"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

export function ProductForm() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string | undefined;
  const isEdit = Boolean(productId);

  const existing = isEdit ? getProduct(productId!) : null;

  const [categories, setCategories] = useState(() => listCategories());
  const [name, setName] = useState(existing?.name || "");
  const [sku, setSku] = useState(existing?.sku || "");
  const [barcode, setBarcode] = useState(existing?.barcode || "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId || "");
  const [unit, setUnit] = useState(existing?.unit || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [cost, setCost] = useState(existing ? String(existing.costMinor / 100) : "");
  const [price, setPrice] = useState(existing ? String(existing.priceMinor / 100) : "");
  const [taxRate, setTaxRate] = useState(
    existing ? String(bpToPercent(existing.taxRateBp)) : String(bpToPercent(MOCK_SETTINGS.defaultTaxRateBp))
  );
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : "0");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    existing ? String(existing.lowStockThreshold) : String(MOCK_SETTINGS.lowStockDefault)
  );
  const [isActive, setIsActive] = useState(existing?.isActive !== false);
  const [imageData, setImageData] = useState<string | null>(existing?.image || null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => void) | null>(null);

  const imageHostRef = useRef<HTMLDivElement>(null);

  if (isEdit && !existing) {
    return (
      <div className="stack">
        <Card>
          <EmptyState
            iconName="search"
            title="المنتج غير موجود"
            text="ربما حُذف هذا المنتج."
            action={
              <Link href="/products" className="btn btn--primary">
                <span>العودة إلى المنتجات</span>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  function clearErrors() {
    setErrors({});
  }

  function collect() {
    return {
      name,
      sku,
      barcode,
      categoryId,
      unit,
      description,
      cost,
      price,
      taxRate,
      quantity,
      lowStockThreshold,
      isActive,
      image: imageData || null,
    };
  }

  async function handleSave(andAnother = false) {
    clearErrors();
    setSaving(true);

    const result = validateProduct(collect());
    if (!result.ok) {
      setErrors(result.errors);
      const firstKey = Object.keys(result.errors)[0];
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      el?.focus();
      toastError("راجع الحقول المميزة بالأحمر");
      setSaving(false);
      return;
    }

    if (!result.value) {
      setSaving(false);
      return;
    }

    if (result.value.priceMinor < result.value.costMinor) {
      setPendingSave(() => () => doSave(result, andAnother));
      setShowPriceWarning(true);
      setSaving(false);
      return;
    }

    await doSave(result, andAnother);
  }

  async function doSave(result: ReturnType<typeof validateProduct>, andAnother: boolean) {
    if (!result.value) {
      setSaving(false);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        updateProduct(productId!, result.value);
        const delta = result.value.quantity - (existing?.quantity || 0);
        if (delta !== 0) {
          applyMovement(productId!, delta);
        }
        toastOk("تم حفظ التعديلات");
        router.push("/products");
      } else {
        const created = createProduct({
          ...result.value,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        } as any);
        if (created.quantity > 0) {
          MOCK_MOVEMENTS.push({
            id: `mov-${created.id}`,
            productId: created.id,
            sku: created.sku,
            productName: created.name,
            type: MOVEMENT.INITIAL,
            quantity: created.quantity,
            balanceAfter: created.quantity,
            reason: "رصيد افتتاحي",
            note: "",
            refType: "product-create",
            refId: created.id,
            actor: "المستخدم",
            createdAt: created.createdAt,
            dayKey: created.createdAt.slice(0, 10),
          });
        }
        toastOk(`تمت إضافة "${created.name}"`);
        if (andAnother) {
          setName("");
          setSku("");
          setBarcode("");
          setCategoryId("");
          setUnit("");
          setDescription("");
          setCost("");
          setPrice("");
          setTaxRate(String(bpToPercent(MOCK_SETTINGS.defaultTaxRateBp)));
          setQuantity("0");
          setLowStockThreshold(String(MOCK_SETTINGS.lowStockDefault));
          setIsActive(true);
          setImageData(null);
          setErrors({});
        } else {
          router.push("/products");
        }
      }
    } catch (error) {
      toastError(error instanceof Error ? error.message : "تعذّر حفظ المنتج");
    } finally {
      setSaving(false);
    }
  }

  async function handleNewCategory() {
    const name = prompt("اسم الفئة");
    if (!name?.trim()) return;
    try {
      const created = createCategory({ id: crypto.randomUUID(), name: name.trim(), sortOrder: categories.length + 1 });
      setCategories([...categories, created]);
      setCategoryId(created.id);
      toastOk(`تمت إضافة الفئة "${created.name}"`);
    } catch {
      toastError("تعذّر إضافة الفئة");
    }
  }

  function handleImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData(e.target?.result as string);
      toastOk(`تم رفع الصورة (${formatBytes(file.size)} بعد الضغط)`);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="مسار التنقل">
        <Link href="/products" className="breadcrumb__link">
          المنتجات
        </Link>
        <span className="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </span>
        <span>{isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}</span>
      </nav>

      <div className="title-row">
        <div className="title-row__icon">
          <span className="icon">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.55 4.24" />
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
          </span>
        </div>
        <h2 className="page__title">{isEdit ? `تعديل: ${existing?.name}` : "إضافة منتج جديد"}</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="form-layout">
          <div className="stack">
            <Card>
              <div className="stack" style={{ gap: "24px" }}>
                <div className="form-section">
                  <h2 className="form-section__title">البيانات الأساسية</h2>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field__label">
                        اسم المنتج <span className="field__req">*</span>
                      </label>
                      <input
                        name="name"
                        className={cn("input", errors.name && "input-error")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أدخل اسم المنتج"
                        maxLength={LIMITS.name}
                      />
                      {errors.name && <p className="field__error">{errors.name}</p>}
                    </div>
                    <div className="field">
                      <label className="field__label">
                        SKU <span className="field__req">*</span>
                      </label>
                      <input
                        name="sku"
                        className={cn("input", errors.sku && "input-error")}
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        placeholder="أدخل SKU"
                        maxLength={LIMITS.sku}
                      />
                      {errors.sku && <p className="field__error">{errors.sku}</p>}
                      <p className="field__hint">رمز فريد لا يتكرر بين المنتجات</p>
                    </div>
                    <div className="field">
                      <label className="field__label">Barcode</label>
                      <input
                        name="barcode"
                        className={cn("input", errors.barcode && "input-error")}
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="أدخل الباركود"
                        maxLength={LIMITS.barcode}
                      />
                      {errors.barcode && <p className="field__error">{errors.barcode}</p>}
                    </div>
                  </div>
                  <div className="form-grid--2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="field">
                      <label className="field__label">
                        الفئة <span className="field__req">*</span>
                      </label>
                      <select
                        name="categoryId"
                        className={cn("select", errors.categoryId && "input-error")}
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">اختر الفئة</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                        <option value="__new">+ فئة جديدة…</option>
                      </select>
                      {errors.categoryId && <p className="field__error">{errors.categoryId}</p>}
                    </div>
                    <div className="field">
                      <label className="field__label">
                        الوحدة <span className="field__req">*</span>
                      </label>
                      <select
                        name="unit"
                        className={cn("select", errors.unit && "input-error")}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        <option value="">اختر الوحدة</option>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      {errors.unit && <p className="field__error">{errors.unit}</p>}
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label">الوصف</label>
                    <textarea
                      name="description"
                      className="textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="أدخل وصف المنتج (اختياري)"
                      maxLength={LIMITS.description}
                      rows={3}
                    />
                    <p className="field__counter">
                      {description.length} / {LIMITS.description}
                    </p>
                  </div>
                </div>

                <div className="form-section">
                  <h2 className="form-section__title">التسعير</h2>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field__label">
                        سعر الشراء <span className="field__req">*</span>
                      </label>
                      <div className="input-affix">
                        <input
                          name="cost"
                          type="number"
                          step="0.01"
                          min="0"
                          className={cn("input", errors.cost && "input-error")}
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                          placeholder="أدخل سعر الشراء"
                        />
                        <span className="input-affix__suffix">{MOCK_SETTINGS.currencySymbol}</span>
                      </div>
                      {errors.cost && <p className="field__error">{errors.cost}</p>}
                    </div>
                    <div className="field">
                      <label className="field__label">
                        سعر البيع <span className="field__req">*</span>
                      </label>
                      <div className="input-affix">
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          className={cn("input", errors.price && "input-error")}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="أدخل سعر البيع"
                        />
                        <span className="input-affix__suffix">{MOCK_SETTINGS.currencySymbol}</span>
                      </div>
                      {errors.price && <p className="field__error">{errors.price}</p>}
                    </div>
                    <div className="field">
                      <label className="field__label">
                        الضريبة <span className="field__req">*</span>
                      </label>
                      <select
                        name="tax"
                        className={cn("select", errors.taxRate && "input-error")}
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                      >
                        {TAX_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.taxRate && <p className="field__error">{errors.taxRate}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="صورة المنتج">
              <div ref={imageHostRef}>
                {imageData ? (
                  <div className="stack" style={{ gap: "10px" }}>
                    <img
                      src={imageData}
                      alt="معاينة صورة المنتج"
                      style={{ width: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "8px", background: "var(--surface-2)" }}
                    />
                    <Button
                      variant="outline-danger"
                      size="sm"
                      block
                      onClick={() => setImageData(null)}
                      type="button"
                    >
                      <span className="icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </span>
                      <span>إزالة الصورة</span>
                    </Button>
                  </div>
                ) : (
                  <FileDrop
                    onFiles={(files) => handleImage(files[0])}
                    accept="image/png,image/jpeg,image/webp"
                    previews={
                      imageData
                        ? [{ name: "صورة المنتج", url: imageData }]
                        : undefined
                    }
                  />
                )}
              </div>
            </Card>

            <Card title="المخزون">
              <div className="stack">
                <div className="field">
                  <label className="field__label">
                    {isEdit ? "الكمية الحالية" : "الكمية الحالية"}
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    className={cn("input", errors.quantity && "input-error")}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  {errors.quantity && <p className="field__error">{errors.quantity}</p>}
                  <p className="field__hint">
                    {isEdit ? "التعديل هنا يُسجَّل كحركة مخزون بسبب «خطأ إدخال»" : "الرصيد الافتتاحي"}
                  </p>
                </div>
                <div className="field">
                  <label className="field__label">حد المخزون المنخفض</label>
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    className={cn("input", errors.lowStockThreshold && "input-error")}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="أدخل حد المخزون المنخفض"
                  />
                  {errors.lowStockThreshold && <p className="field__error">{errors.lowStockThreshold}</p>}
                </div>
              </div>
            </Card>

            <Card>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>الحالة</span>
                <ToggleField label="نشط" checked={isActive} onChange={setIsActive} />
              </div>
            </Card>
          </div>
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary" disabled={saving}>
            <span className="icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </span>
            <span>{isEdit ? "حفظ التعديلات" : "حفظ المنتج"}</span>
          </Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              <span>حفظ وإضافة آخر</span>
            </Button>
          )}
          <Link href="/products" className="btn btn--ghost">
            <span>إلغاء</span>
          </Link>
        </div>
      </form>

      {showPriceWarning && (
        <div className="modal-region" onClick={() => setShowPriceWarning(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__head">
              <h3 className="modal__title">سعر البيع أقل من سعر الشراء</h3>
              <button type="button" className="icon-btn" onClick={() => setShowPriceWarning(false)} aria-label="إغلاق">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal__body">
              <p>سيؤدي هذا إلى خسارة في كل عملية بيع لهذا المنتج. هل تريد المتابعة؟</p>
            </div>
            <div className="modal__foot">
              <Button variant="ghost" onClick={() => setShowPriceWarning(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowPriceWarning(false);
                  if (pendingSave) {
                    pendingSave();
                    setPendingSave(null);
                  }
                }}
              >
                متابعة على أي حال
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
