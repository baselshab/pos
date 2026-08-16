export const LIMITS = {
  name: 120,
  sku: 40,
  barcode: 40,
  description: 500,
  note: 200,
  phone: 24,
  reference: 40,
  imageBytes: 5 * 1024 * 1024,
  attachmentBytes: 5 * 1024 * 1024,
  backupBytes: 100 * 1024 * 1024,
  maxQuantity: 1_000_000,
  maxAmountMinor: 99_999_999_999,
};

export function normalizeText(value: unknown, max = 255) {
  return String(value ?? "")
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeMultiline(value: unknown, max = 500) {
  return String(value ?? "")
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeSku(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-_.]/g, "")
    .slice(0, LIMITS.sku);
}

export function normalizeBarcode(value: unknown) {
  const clean = String(value ?? "").trim().replace(/[^A-Za-z0-9]/g, "").slice(0, LIMITS.barcode);
  return clean || undefined;
}

export function parseQuantity(value: unknown, { allowNegative = false, allowZero = true } = {}) {
  const num = Number(
    String(value ?? "")
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[,\s]/g, "")
  );
  if (!Number.isFinite(num)) return NaN;
  if (!Number.isInteger(num)) return NaN;
  if (!allowNegative && num < 0) return NaN;
  if (!allowZero && num === 0) return NaN;
  if (Math.abs(num) > LIMITS.maxQuantity) return NaN;
  return num;
}

export function toMinor(input: unknown) {
  if (input == null || input === "") return 0;
  const normalized = String(input)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[,\s٬ ]/g, "")
    .replace(/٫/g, ".")
    .trim();
  if (!/^-?\d*\.?\d*$/.test(normalized) || normalized === "" || normalized === "-") return NaN;
  const negative = normalized.startsWith("-");
  const [whole = "0", fraction = ""] = normalized.replace("-", "").split(".");
  const cents = (fraction + "00").slice(0, 2);
  const third = Number(fraction[2] || 0);
  let value = Number(whole) * 100 + Number(cents);
  if (third >= 5) value += 1;
  if (!Number.isFinite(value)) return NaN;
  return negative ? -value : value;
}

export function roundHalfUp(value: number) {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function percentToBp(percent: unknown) {
  const value = Number(percent);
  if (!Number.isFinite(value)) return 0;
  return roundHalfUp(value * 100);
}

export function bpToPercent(bp: unknown) {
  return (Number(bp) ?? 0) / 100;
}

export function validateProduct(input: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const name = normalizeText(input.name, LIMITS.name);
  if (!name) errors.name = "اسم المنتج مطلوب";
  const sku = normalizeSku(input.sku);
  if (!sku) errors.sku = "رمز SKU مطلوب";
  else if (sku.length < 2) errors.sku = "رمز SKU قصير جداً";
  const barcode = normalizeBarcode(input.barcode);
  const categoryId = normalizeText(input.categoryId, 60);
  if (!categoryId) errors.categoryId = "الفئة مطلوبة";
  const unit = normalizeText(input.unit, 20);
  if (!unit) errors.unit = "الوحدة مطلوبة";
  const costMinor = toMinor(input.costMinor ?? input.cost);
  if (!Number.isFinite(costMinor) || costMinor < 0) errors.cost = "سعر الشراء غير صالح";
  else if (costMinor > LIMITS.maxAmountMinor) errors.cost = "سعر الشراء كبير جداً";
  const priceMinor = toMinor(input.priceMinor ?? input.price);
  if (!Number.isFinite(priceMinor) || priceMinor < 0) errors.price = "سعر البيع غير صالح";
  else if (priceMinor > LIMITS.maxAmountMinor) errors.price = "سعر البيع كبير جداً";
  const taxRateBp =
    input.taxRateBp != null ? Math.trunc(Number(input.taxRateBp)) : percentToBp(input.taxRate ?? 0);
  if (!Number.isFinite(taxRateBp) || taxRateBp < 0 || taxRateBp > 10000) {
    errors.taxRate = "نسبة الضريبة يجب أن تكون بين 0 و100";
  }
  const quantity = parseQuantity(input.quantity ?? 0);
  if (Number.isNaN(quantity)) errors.quantity = "الكمية يجب أن تكون عدداً صحيحاً غير سالب";
  const lowStockThreshold = parseQuantity(input.lowStockThreshold ?? 0);
  if (Number.isNaN(lowStockThreshold)) errors.lowStockThreshold = "حد المخزون المنخفض غير صالح";
  const description = normalizeMultiline(input.description, LIMITS.description);
  if (!Object.keys(errors).length) {
    return {
      ok: true,
      errors: {},
      value: {
        name,
        nameLower: name.toLowerCase(),
        sku,
        barcode,
        categoryId,
        unit,
        costMinor,
        priceMinor,
        taxRateBp,
        quantity,
        lowStockThreshold,
        description,
        image: (input.image ?? null) as string | undefined,
        isActive: input.isActive !== false,
      },
    };
  }
  return { ok: false, errors, value: null };
}

export function validateAdjustment(input: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const productId = normalizeText(input.productId, 60);
  if (!productId) errors.productId = "اختر منتجاً";
  const quantity = parseQuantity(input.quantity, { allowNegative: true, allowZero: false });
  if (Number.isNaN(quantity)) errors.quantity = "الكمية يجب أن تكون عدداً صحيحاً غير صفري";
  const reason = normalizeText(input.reason, 60);
  if (!reason) errors.reason = "السبب مطلوب";
  const note = normalizeMultiline(input.note, LIMITS.note);
  if (!Object.keys(errors).length) {
    return { ok: true, errors: {}, value: { productId, quantity, reason, note } };
  }
  return { ok: false, errors, value: null };
}
