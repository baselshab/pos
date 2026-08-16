"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus, Trash2, CheckCircle, Printer, Eye, Pause, User, Search, Barcode, Minus, X, Banknote, CreditCard } from "lucide-react";
import { Card, Badge, EmptyState, Button, SearchField, ChipGroup, Avatar } from "@/components/ui";
import { Modal, ConfirmDialog, useToast } from "@/components/feedback";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/StoreProvider";
import { getProducts } from "@/app/actions/products";
import { getCustomers } from "@/app/actions/customers";
import { createSale } from "@/app/actions/sales";
import type { Product } from "@/repositories/products.repository";
import type { Customer } from "@/repositories/customers.repository";

const SYMBOL = "ر.س";

const WALK_IN = { id: "walkin", name: "عميل نقدي", phone: "", isWalkIn: true };

const PAYMENT_TYPE = { CASH: "cash", CREDIT: "credit" };

const STOCK_STATUS = { OK: "ok", LOW: "low", OUT: "out" };
const STOCK_LABEL: Record<string, string> = { ok: "متوفر", low: "منخفض", out: "نفد" };
const STOCK_TONE: Record<string, string> = { ok: "green", low: "amber", out: "red" };

function formatAmount(minor: number) {
  return (minor / 100).toFixed(2);
}

function formatInt(n: number) {
  return String(n);
}

function ltr(text: string) {
  return <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "var(--font-num)" }}>{text}</span>;
}

function itemsLabel(count: number) {
  return `${count} صنف`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function computeTotals(lines: { unitPriceMinor: number; quantity: number }[], discount: { type: string; value: number }, taxRateBp: number, taxInclusive: boolean) {
  const subtotalMinor = lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
  let discountMinor = 0;
  if (discount.type === "percent") {
    discountMinor = Math.round((subtotalMinor * discount.value) / 10000);
  } else {
    discountMinor = discount.value;
  }
  const afterDiscount = subtotalMinor - discountMinor;
  let taxMinor = 0;
  if (taxInclusive) {
    const taxable = afterDiscount;
    taxMinor = Math.round(taxable - taxable / (1 + taxRateBp / 10000));
  } else {
    taxMinor = Math.round(afterDiscount * taxRateBp / 10000);
  }
  const totalMinor = afterDiscount + taxMinor;
  return { subtotalMinor, discountMinor, taxMinor, totalMinor };
}

function toMinor(raw: string) {
  const normalized = raw.replace(/[^\d.]/g, "");
  const num = parseFloat(normalized);
  if (!Number.isFinite(num)) return NaN;
  return Math.round(num * 100);
}

function percentToBp(percent: number) {
  return Math.round(percent * 100);
}

function bpToPercent(bp: number) {
  return (bp / 100).toFixed(2);
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPriceMinor: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  customer: typeof WALK_IN;
  paymentType: string;
  discount: { type: string; value: number };
}

const SETTINGS = {
  currencySymbol: SYMBOL,
  allowNegativeStock: false,
  allowDiscount: true,
  defaultTaxRateBp: 1500,
  taxInclusive: false,
  maxDiscountPercent: 50,
  dateFormat: "short",
};

export default function PosPage() {
  const router = useRouter();
  const { toasts, toastOk, toastError, toastWarn, dismiss } = useToast();
  const { storeId } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suspended, setSuspended] = useState<any[]>([]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [cart, setCart] = useState<CartState>({
    lines: [],
    customer: WALK_IN,
    paymentType: PAYMENT_TYPE.CASH,
    discount: { type: "amount", value: 0 },
  });

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleResult, setSaleResult] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      try {
        const [prods, custs] = await Promise.all([
          getProducts(storeId),
          getCustomers(storeId)
        ]);
        setProducts(prods);
        setCustomers(custs);
        setCategories([{ id: "all", name: "الكل" }]);
      } catch (error) {
        toastError("تعذّر تحميل البيانات");
      }
    }
    load();
  }, [storeId]);

  const active = products.filter((p) => (p as any).isActive !== false);

  const visibleProducts = () => {
    const term = query.trim().toLowerCase();
    return active.filter((product) => {
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
      if (!term) return true;
      return `${product.name} ${product.sku} ${product.barcode || ""}`
        .toLowerCase()
        .includes(term);
    });
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const line = prev.lines.find((l) => l.productId === product.id);
      const nextQty = (line?.quantity || 0) + 1;

      if (!SETTINGS.allowNegativeStock && nextQty > product.quantity) {
        toastWarn(`الكمية المتاحة من "${product.name}" هي ${product.quantity} فقط`);
        return prev;
      }

      if (line) {
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.productId === product.id ? { ...l, quantity: nextQty } : l
          ),
        };
      }
      return {
        ...prev,
        lines: [
          ...prev.lines,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unitPriceMinor: product.priceMinor,
            quantity: 1,
          },
        ],
      };
    });
  };

  const totals = () => {
    return computeTotals(cart.lines, cart.discount, SETTINGS.defaultTaxRateBp, SETTINGS.taxInclusive);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines
        .map((l) => (l.productId === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.productId !== productId),
    }));
  };

  const setCartCustomer = (customer: any) => {
    setCart((prev) => ({ ...prev, customer }));
  };

  const setCartDiscount = (discount: CartState["discount"]) => {
    setCart((prev) => ({ ...prev, discount }));
  };

  const setCartPaymentType = (type: string) => {
    setCart((prev) => ({ ...prev, paymentType: type }));
  };

  const clearCart = () => {
    setCart({
      lines: [],
      customer: WALK_IN,
      paymentType: PAYMENT_TYPE.CASH,
      discount: { type: "amount", value: 0 },
    });
  };

  const handleSuspend = () => {
    const newSuspended = {
      id: `sus-${Date.now()}`,
      customerName: cart.customer.name,
      itemCount: cart.lines.reduce((s, l) => s + l.quantity, 0),
      totalMinor: totals().totalMinor,
      createdAt: new Date().toISOString(),
      lines: [...cart.lines],
      customer: cart.customer,
      discount: cart.discount,
      paymentType: cart.paymentType,
    };
    setSuspended((prev) => [...prev, newSuspended]);
    clearCart();
    toastOk("تم تعليق البيع. يمكنك استعادته لاحقاً.");
  };

  const handleResume = (item: any) => {
    setCart({
      lines: item.lines,
      customer: item.customer,
      paymentType: item.paymentType || PAYMENT_TYPE.CASH,
      discount: item.discount || { type: "amount", value: 0 },
    });
    setSuspended((prev) => prev.filter((s) => s.id !== item.id));
    setShowSuspended(false);
    toastOk("تمت استعادة البيع المعلّق");
  };

  const handleDeleteSuspended = (id: string) => {
    setSuspended((prev) => prev.filter((s) => s.id !== id));
    toastOk("تم حذف البيع المعلّق");
  };

  const handleCheckout = () => {
    if (cart.lines.length === 0) return;
    if (cart.paymentType === PAYMENT_TYPE.CREDIT && !cart.customer.id) {
      toastError("البيع الآجل يتطلب اختيار عميل مسجّل");
      return;
    }
    setShowCheckout(true);
  };

  const confirmCheckout = async () => {
    if (!storeId) return;
    const sums = totals();
    setShowCheckout(false);
    try {
      const sale = await createSale(storeId, {
        sale: {
          customerId: cart.customer.id,
          customerName: cart.customer.name,
          paymentType: cart.paymentType,
          subtotalMinor: sums.subtotalMinor,
          discountMinor: sums.discountMinor,
          taxRateBp: SETTINGS.defaultTaxRateBp,
          taxInclusive: SETTINGS.taxInclusive,
          taxMinor: sums.taxMinor,
          totalMinor: sums.totalMinor,
          paidMinor: cart.paymentType === PAYMENT_TYPE.CASH ? sums.totalMinor : 0,
          dueMinor: cart.paymentType === PAYMENT_TYPE.CREDIT ? sums.totalMinor : 0,
          itemCount: cart.lines.length,
          unitCount: cart.lines.reduce((s, l) => s + l.quantity, 0),
          costMinor: cart.lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0),
          dayKey: new Date().toISOString().slice(0, 10),
          number: `INV-${String(Date.now() % 1000).padStart(3, "0")}`,
          status: "completed",
          note: ""
        },
        items: cart.lines.map((l) => ({
          productId: l.productId,
          sku: l.sku,
          name: l.name,
          unit: "قطعة",
          quantity: l.quantity,
          unitPriceMinor: l.unitPriceMinor,
          unitCostMinor: l.unitPriceMinor
        }))
      });
      setSaleResult(sale);
      setSaleItems(cart.lines);
      clearCart();
      toastOk("تم إتمام البيع بنجاح");
      setShowReceipt(true);
    } catch (error) {
      toastError("تعذّر إتمام البيع");
    }
  };

  const handlePrint = () => {
    toastOk("جارٍ إرسال الفاتورة للطباعة...");
    setShowReceipt(false);
  };

  const items = visibleProducts();
  const sums = totals();
  const isEmpty = cart.lines.length === 0;

  return (
    <div className="pos">
      <div>
        <div className="pos__search-row">
          <div className="search" style={{ flex: 1 }}>
            <span className="search__icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="input"
              placeholder="بحث باسم المنتج أو SKU أو Barcode"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
              }}
            />
            {query && (
              <button type="button" className="search__clear" onClick={() => setQuery("")} aria-label="مسح">
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="pos__scan"
            aria-label="إدخال باركود يدوياً"
            onClick={() => searchInputRef.current?.focus()}
          >
            <span className="icon">
              <Barcode size={20} />
            </span>
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-2)" }}>
            <div style={{ marginBottom: 12 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>لا نتائج</h3>
            <p style={{ fontSize: 13.5 }}>جرّب اسماً آخر أو امسح الفلاتر.</p>
          </div>
        ) : (
          <div className="product-grid">
            {items.map((product) => {
              const status = product.quantity === 0 ? STOCK_STATUS.OUT : product.quantity <= (product.lowStockThreshold ?? 5) ? STOCK_STATUS.LOW : STOCK_STATUS.OK;
              const isOut = status === STOCK_STATUS.OUT && !SETTINGS.allowNegativeStock;
              return (
                <button
                  key={product.id}
                  type="button"
                  className="product-card"
                  disabled={isOut || undefined}
                  aria-label={`${product.name}، ${formatAmount(product.priceMinor)} ${SYMBOL}، ${STOCK_LABEL[status]}`}
                  onClick={() => addToCart(product)}
                >
                  <span className="product-card__badge">
                    <Badge tone={STOCK_TONE[status]}>{STOCK_LABEL[status]}</Badge>
                  </span>
                  {product.imageUrl ? (
                    <img className="product-card__img" src={product.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="product-card__img product-card__img--ph">
                      <span className="icon">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16.5 9.4 7.55 4.24" />
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.29 7 12 12 20.71 7" />
                          <line x1="12" y1="22" x2="12" y2="12" />
                        </svg>
                      </span>
                    </div>
                  )}
                  <span className="product-card__name">{product.name}</span>
                  <span className="product-card__price">
                    {ltr(formatAmount(product.priceMinor))} {SYMBOL}
                  </span>
                  <span className="product-card__sku">{ltr(product.sku)}</span>
                  <span className="product-card__stock">المخزون: {ltr(String(product.quantity))}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="cart">
        <Card
          title="العربة"
          titleIcon={<span className="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>}
          flush
          actions={
            suspended.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setShowSuspended(true)}>
                <span className="icon"><Pause size={14} /></span>
                معلّقة ({suspended.length})
              </Button>
            ) : null
          }
        >
          <div>
            <div style={{ padding: "16px 20px 0" }}>
              <button
                type="button"
                className="cart__customer"
                onClick={() => setShowCustomerPicker(true)}
              >
                {cart.customer.id ? (
                  <Avatar initials={initials(cart.customer.name)} size="sm" />
                ) : (
                  <span className="user-chip__avatar">
                    <User size={18} />
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="cart__customer-label" style={{ display: "block" }}>اختيار العميل</span>
                  <span className="cart__customer-name">{cart.customer.name}</span>
                </span>
                <ChevronDown size={17} className="icon-chev" />
              </button>
            </div>

            {isEmpty ? (
              <EmptyState
                iconName="pos"
                title="العربة فارغة"
                text="اختر منتجاً من القائمة لبدء الفاتورة."
              />
            ) : (
              <div className="cart__items">
                <table className="table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                      <th>الإجمالي</th>
                      <th className="is-actions"><span className="sr-only">حذف</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.lines.map((line) => {
                      const product = active.find((p) => p.id === line.productId);
                      const max = SETTINGS.allowNegativeStock ? 999999 : (product?.quantity ?? 0);
                      return (
                        <tr key={line.productId}>
                          <td>
                            <div className="table__main">{line.name}</div>
                            <div className="table__sub">{ltr(line.sku)}</div>
                          </td>
                          <td>
                            <div className="qty-stepper">
                              <button
                                type="button"
                                className="qty-stepper__btn"
                                aria-label={`زيادة كمية ${line.name}`}
                                disabled={line.quantity >= max}
                                onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                              >
                                +
                              </button>
                              <input
                                className="qty-stepper__input"
                                type="number"
                                value={line.quantity}
                                min="0"
                                aria-label={`كمية ${line.name}`}
                                onChange={(e) => updateQuantity(line.productId, Math.max(0, parseInt(e.target.value) || 0))}
                              />
                              <button
                                type="button"
                                className="qty-stepper__btn"
                                aria-label={`إنقاص كمية ${line.name}`}
                                onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                              >
                                −
                              </button>
                            </div>
                          </td>
                          <td>{ltr(formatAmount(line.unitPriceMinor))} {SYMBOL}</td>
                          <td>{ltr(formatAmount(line.unitPriceMinor * line.quantity))} {SYMBOL}</td>
                          <td className="is-actions">
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              aria-label={`حذف ${line.name} من العربة`}
                              onClick={() => removeFromCart(line.productId)}
                            >
                              <span className="icon"><Trash2 size={16} /></span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="cart__totals">
              <div className="cart__row">
                <span className="cart__label">المجموع الفرعي</span>
                <span className="cart__amount">{ltr(formatAmount(sums.subtotalMinor))} {SYMBOL}</span>
              </div>
              {SETTINGS.allowDiscount && (
                <div className="cart__row">
                  <span className="cart__label">
                    <span className="icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
                    الخصم
                  </span>
                  <span className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="cart__discount-btn"
                      aria-label="تعديل الخصم"
                      onClick={() => setShowDiscount(true)}
                    >
                      <span className="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
                    </button>
                    <span className="cart__amount">{ltr(formatAmount(sums.discountMinor))} {SYMBOL}</span>
                  </span>
                </div>
              )}
              <div className="cart__row">
                <span className="cart__label">الضريبة ({bpToPercent(SETTINGS.defaultTaxRateBp)}%)</span>
                <span className="cart__amount">{ltr(formatAmount(sums.taxMinor))} {SYMBOL}</span>
              </div>
              <div className="cart__row cart__row--total">
                <span>الإجمالي النهائي</span>
                <span className="cart__amount">{ltr(formatAmount(sums.totalMinor))} {SYMBOL}</span>
              </div>
            </div>

            <div className="cart__pay" role="group" aria-label="طريقة الدفع">
              <button
                type="button"
                className={cn("segmented__btn", cart.paymentType === PAYMENT_TYPE.CASH && "is-green")}
                aria-pressed={cart.paymentType === PAYMENT_TYPE.CASH}
                onClick={() => setCartPaymentType(PAYMENT_TYPE.CASH)}
              >
                <span className="icon"><Banknote size={17} /></span>
                <span>نقدي</span>
              </button>
              <button
                type="button"
                className={cn("segmented__btn", cart.paymentType === PAYMENT_TYPE.CREDIT && "is-green")}
                aria-pressed={cart.paymentType === PAYMENT_TYPE.CREDIT}
                disabled={!cart.customer.id}
                onClick={() => setCartPaymentType(PAYMENT_TYPE.CREDIT)}
              >
                <span className="icon"><CreditCard size={17} /></span>
                <span>آجل</span>
              </button>
            </div>

            <div className="cart__actions">
              <Button
                variant="success"
                size="lg"
                block
                disabled={isEmpty}
                onClick={handleCheckout}
              >
                <span>إتمام البيع</span>
                <span className="icon"><CheckCircle size={18} /></span>
              </Button>
              <div className="cart__actions-row">
                <Button variant="outline" disabled={isEmpty} onClick={handleSuspend}>
                  <span>تعليق البيع</span>
                  <span className="icon"><Pause size={16} /></span>
                </Button>
                <Button variant="outline-danger" disabled={isEmpty} onClick={() => {
                  setCart((prev) => ({ ...prev, lines: [], discount: { type: "amount", value: 0 } }));
                }}>
                  <span>تفريغ العربة</span>
                  <span className="icon"><Trash2 size={16} /></span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} title="اختيار العميل" footer={
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <Button variant="outline" onClick={() => setShowCustomerPicker(false)}>إلغاء</Button>
        </div>
      }>
        <div className="stack" style={{ gap: 4 }}>
          <SearchField
            value=""
            onChange={() => {}}
            placeholder="بحث بالاسم أو الهاتف"
          />
          <div className="stack" style={{ gap: 4 }}>
            <button
              type="button"
              className={cn("cart__customer", cart.customer.id === WALK_IN.id && "is-selected")}
              onClick={() => { setCartCustomer(WALK_IN); setShowCustomerPicker(false); }}
              style={cart.customer.id === WALK_IN.id ? { borderColor: "var(--green)", background: "var(--green-soft)" } : {}}
            >
              <span className="user-chip__avatar"><User size={18} /></span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                <span className="cart__customer-name" style={{ display: "block" }}>عميل نقدي</span>
              </span>
              {cart.customer.id === WALK_IN.id && <span className="icon"><CheckCircle size={16} /></span>}
            </button>
            {customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn("cart__customer", cart.customer.id === customer.id && "is-selected")}
                onClick={() => { setCartCustomer(customer as any); setShowCustomerPicker(false); }}
                style={cart.customer.id === customer.id ? { borderColor: "var(--green)", background: "var(--green-soft)" } : {}}
              >
                <Avatar initials={initials(customer.name)} size="sm" />
                <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                  <span className="cart__customer-name" style={{ display: "block" }}>{customer.name}</span>
                  {customer.phone && <span className="cart__customer-label">{ltr(customer.phone)}</span>}
                </span>
                {cart.customer.id === customer.id && <span className="icon"><CheckCircle size={16} /></span>}
              </button>
            ))}
            {customers.length === 0 && (
              <p className="field__hint" style={{ padding: 12 }}>لا نتائج مطابقة.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showDiscount} onClose={() => setShowDiscount(false)} title="خصم على الفاتورة" footer={
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <Button variant="primary" onClick={() => setShowDiscount(false)}>تطبيق</Button>
          <Button variant="ghost" onClick={() => { setCartDiscount({ type: "amount", value: 0 }); setShowDiscount(false); }}>إزالة الخصم</Button>
        </div>
      }>
        <SegmentedControl
          items={[
            { value: "amount", label: `مبلغ (${SYMBOL})` },
            { value: "percent", label: "نسبة (%)" },
          ]}
          value={cart.discount.type}
          onChange={(value) => setCartDiscount({ ...cart.discount, type: value })}
          color="blue"
        />
        <div className="stack" style={{ gap: 8 }}>
          <div className="field">
            <label className="field__label">قيمة الخصم</label>
            <div className="input-affix">
              <input
                type="text"
                className="input"
                value={cart.discount.type === "percent" ? bpToPercent(cart.discount.value) : String(cart.discount.value / 100 || "")}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (cart.discount.type === "percent") {
                    const num = parseFloat(raw);
                    if (Number.isFinite(num)) {
                      setCartDiscount({ type: "percent", value: percentToBp(Math.max(0, Math.min(100, num))) });
                    }
                  } else {
                    const minor = toMinor(raw);
                    if (Number.isFinite(minor) && minor >= 0) {
                      setCartDiscount({ type: "amount", value: Math.min(minor, sums.subtotalMinor) });
                    }
                  }
                }}
              />
              <span className="input-affix__suffix">{cart.discount.type === "percent" ? "%" : SYMBOL}</span>
            </div>
            <p className="field__hint">المجموع الفرعي {formatAmount(sums.subtotalMinor)} {SYMBOL}</p>
          </div>
        </div>
      </Modal>

      <Modal open={showSuspended} onClose={() => setShowSuspended(false)} title="البيوع المعلّقة" footer={
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => setShowSuspended(false)}>إغلاق</Button>
        </div>
      }>
        <div className="stack" style={{ gap: 8 }}>
          {suspended.length === 0 ? (
            <EmptyState iconName="pause" title="لا بيوع معلّقة" text="البيوع التي تعلّقها ستظهر هنا." />
          ) : (
            suspended.map((item) => (
              <div key={item.id} className="cart__customer" style={{ cursor: "default" }}>
                <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                  <div className="cart__customer-name">{item.customerName}</div>
                  <div className="cart__customer-label">
                    {itemsLabel(item.itemCount)} · {ltr(formatAmount(item.totalMinor))} {SYMBOL} · {ltr(formatDateTime(item.createdAt))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleResume(item)}>استعادة</Button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label="حذف البيع المعلّق"
                  onClick={() => handleDeleteSuspended(item.id)}
                >
                  <span className="icon"><Trash2 size={16} /></span>
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        onConfirm={confirmCheckout}
        title="تأكيد البيع"
        message={`
          العميل: ${cart.customer.name}
          طريقة الدفع: ${cart.paymentType === PAYMENT_TYPE.CREDIT ? "آجل" : "نقدي"}
          المجموع الفرعي: ${formatAmount(sums.subtotalMinor)} ${SYMBOL}
          الخصم: ${formatAmount(sums.discountMinor)} ${SYMBOL}
          الضريبة: ${formatAmount(sums.taxMinor)} ${SYMBOL}
          الإجمالي: ${formatAmount(sums.totalMinor)} ${SYMBOL}
        `}
        confirmLabel="تأكيد وإتمام البيع"
      />

      <Modal open={showReceipt} onClose={() => setShowReceipt(false)} title="تم إتمام البيع" footer={
        <div className="row" style={{ gap: 8 }}>
          <Button variant="primary" onClick={handlePrint}>
            <span className="icon"><Printer size={16} /></span>
            طباعة
          </Button>
          <Button variant="ghost" onClick={() => { setShowReceipt(false); router.push(`/invoices/${saleResult?.id}`); }}>
            <span className="icon"><Eye size={16} /></span>
            عرض الفاتورة
          </Button>
          <Button variant="ghost" onClick={() => setShowReceipt(false)}>بيع جديد</Button>
        </div>
      }>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--green-soft)",
            color: "var(--green)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto"
          }}>
            <CheckCircle size={30} />
          </div>
          {saleResult && (
            <>
              <p style={{ fontSize: 15 }}>رقم الفاتورة: {ltr(saleResult.number)}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--green)" }}>
                {ltr(formatAmount(saleResult.totalMinor))} {SYMBOL}
              </p>
              {saleResult.dueMinor > 0 && (
                <p style={{ color: "var(--amber)" }}>المتبقي على العميل: {ltr(formatAmount(saleResult.dueMinor))} {SYMBOL}</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
}
