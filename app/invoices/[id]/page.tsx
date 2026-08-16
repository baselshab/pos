"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Printer,
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ArrowLeft,
  Store,
  User,
  Wallet,
  Info,
  History,
  Clock,
  Banknote,
} from "lucide-react";
import { Card, Badge, EmptyState, AlertBox, DetailRow, Button } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { Field } from "@/components/ui/Field";
import { ConfirmDialog, useToast } from "@/components/feedback";
import {
  SALE_STATUS,
  SALE_STATUS_LABEL,
  SALE_STATUS_TONE,
  PAYMENT_TYPE_LABEL,
  MOCK_SALES,
  MOCK_SALE_ITEMS,
  MOCK_CUSTOMERS,
  MOCK_SETTINGS,
  formatAmount,
  formatDateTime,
  bpToPercent,
  toMajor,
} from "@/lib/mock";

const TEMPLATES = { A4: "a4", THERMAL: "thermal" } as const;
const TEMPLATE_LABEL: Record<string, string> = { a4: "A4", thermal: "حرارية" };

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { toastOk } = useToast();
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [template, setTemplate] = useState("a4");

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const found = MOCK_SALES.find((s) => s.id === params.id);
      if (found) {
        setSale(found);
        setItems(MOCK_SALE_ITEMS[params.id] || []);
        setCustomer(found.customerId !== "walkin" ? MOCK_CUSTOMERS.find((c) => c.id === found.customerId) : null);
        setTemplate(MOCK_SETTINGS.printTemplate || "a4");
      }
      setLoading(false);
    }, 300);
  }, [params.id]);

  const handleCancel = () => {
    if (!sale) return;
    setSale((prev: any) => ({ ...prev, status: SALE_STATUS.CANCELLED, cancelledAt: new Date().toISOString(), cancelReason: "إلغاء من شاشة الفاتورة" }));
    toastOk(`تم إلغاء الفاتورة وإرجاع ${items.length} صنفاً إلى المخزون`);
    setConfirmOpen(false);
  };

  const handleExport = () => {
    toastOk("تم تصدير الفاتورة إلى ملف Excel");
  };

  if (loading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!sale) {
    return (
      <Card
        body={
          <EmptyState
            iconName="search"
            title="الفاتورة غير موجودة"
            text="الرابط الذي فتحته لا يطابق أي فاتورة."
            action={
              <Link href="/invoices" className="btn btn--primary">
                <ArrowLeft size={16} />
                <span>العودة إلى الفواتير</span>
              </Link>
            }
          />
        }
      />
    );
  }

  const isCancelled = sale.status === SALE_STATUS.CANCELLED;
  const s = MOCK_SETTINGS;
  const symbol = s.currencySymbol;

  const money = (minor: number) => (
    <span>
      {formatAmount(minor)} {symbol}
    </span>
  );

  const timeline = [
    { title: "تم إنشاء الفاتورة", at: sale.createdAt, actor: "المستخدم" },
    { title: "تم تخفيض المخزون", at: sale.createdAt, actor: "النظام" },
    ...(isCancelled
      ? [{ title: "تم إلغاء الفاتورة وإرجاع المخزون", at: sale.cancelledAt, actor: "المستخدم", tone: "red" as const }]
      : []),
  ];

  return (
    <div className="stack">
      <nav className="breadcrumb">
        <Link href="/invoices" style={{ color: "var(--text-2)" }}>الفواتير</Link>
        <ChevronLeft size={14} />
        <span>{sale.number}</span>
      </nav>

      <div className="page__head">
        <div className="invoice-hero">
          <div>
            <p style={{ color: "var(--text-2)", fontSize: "14px" }}>تفاصيل الفاتورة</p>
            <h2 className="invoice-hero__num">{sale.number}</h2>
          </div>
          <Badge tone={SALE_STATUS_TONE[sale.status]}>
            {isCancelled ? "ملغاة" : SALE_STATUS_LABEL[sale.status]}
          </Badge>
        </div>
        <div className="page__actions">
          <Button variant="ghost" onClick={() => setPrintModalOpen(true)}>
            <Printer size={16} />
            <span>طباعة</span>
          </Button>
          <Button variant="ghost" onClick={() => setPrintModalOpen(true)}>
            <FileText size={16} />
            <span>حفظ PDF</span>
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            <Download size={16} />
            <span>تصدير Excel</span>
          </Button>
          {!isCancelled && (
            <Button variant="outline-danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={16} />
              <span>إلغاء الفاتورة</span>
            </Button>
          )}
        </div>
      </div>

      {isCancelled && (
        <AlertBox type="warn">
          أُلغيت هذه الفاتورة في {formatDateTime(sale.cancelledAt)}{sale.cancelReason ? ` — ${sale.cancelReason}` : ""}. أُعيدت كل الأصناف إلى المخزون.
        </AlertBox>
      )}

      <div className="split-layout">
        <Card className="invoice-doc-card" body={
          <article className="invoice-doc">
            <header className="invoice-doc__head">
              <Receipt size={21} />
              <span>فاتورة مبيعات</span>
            </header>

            <div className="invoice-parties">
              <div className="invoice-parties__col">
                <div className="invoice-parties__title">
                  <Store size={16} />
                  <span>بيانات المتجر</span>
                </div>
                <div className="invoice-parties__name">{s.storeName}</div>
                {s.storeAddress && <div className="invoice-parties__line">{s.storeAddress}</div>}
                {s.storePhone && <div className="invoice-parties__line">هاتف: {s.storePhone}</div>}
                {s.storeCrNumber && <div className="invoice-parties__line">السجل التجاري: {s.storeCrNumber}</div>}
                {s.storeTaxNumber && <div className="invoice-parties__line">الرقم الضريبي: {s.storeTaxNumber}</div>}
              </div>
              <div className="invoice-parties__col">
                <div className="invoice-parties__title">
                  <User size={16} />
                  <span>بيانات العميل</span>
                </div>
                <div className="invoice-parties__name">{sale.customerName}</div>
                {customer?.phone ? (
                  <div className="invoice-parties__line">هاتف: {customer.phone}</div>
                ) : (
                  <div className="invoice-parties__line">عميل نقدي - مبيعات فورية</div>
                )}
                {customer && (
                  <Link href={`/customers/${customer.id}`} className="invoice-parties__line" style={{ color: "var(--blue)" }}>
                    عرض كشف الحساب
                  </Link>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table__main">{item.name}</div>
                        <div className="table__sub">{item.sku}</div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{money(item.unitPriceMinor)}</td>
                      <td>{money(item.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-totals">
              <div className="invoice-totals__row">
                <span>المجموع الفرعي</span>
                {money(sale.subtotalMinor)}
              </div>
              {sale.discountMinor > 0 && (
                <div className="invoice-totals__row">
                  <span>الخصم</span>
                  <span>
                    −{formatAmount(sale.discountMinor)} {symbol}
                  </span>
                </div>
              )}
              <div className="invoice-totals__row">
                <span>الضريبة ({bpToPercent(sale.taxRateBp)}%)</span>
                {money(sale.taxMinor)}
              </div>
              <div className="invoice-totals__row invoice-totals__row--final">
                <span>الإجمالي النهائي</span>
                {money(sale.totalMinor)}
              </div>
            </div>

            {sale.note ? (
              <div className="invoice-note">
                <div className="invoice-note__label">ملاحظة</div>
                <div className="invoice-note__text">{sale.note}</div>
              </div>
            ) : s.invoiceFooter ? (
              <div className="invoice-note">
                <div className="invoice-note__label">ملاحظة</div>
                <div className="invoice-note__text">{s.invoiceFooter}</div>
              </div>
            ) : null}
          </article>
        }
        />

        <div className="detail-panel stack">
          <Card
            title="ملخص الدفع"
            titleIcon={<Wallet size={18} />}
            body={
              <div className="stack" style={{ gap: 2 }}>
                <DetailRow label="نوع الدفع" value={PAYMENT_TYPE_LABEL[sale.paymentType] || "—"} />
                <DetailRow
                  label="المبلغ المدفوع"
                  value={
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>
                      {formatAmount(sale.paidMinor)} {symbol}
                    </span>
                  }
                />
                <DetailRow
                  label="المتبقي"
                  value={
                    <span style={{ color: sale.dueMinor > 0 ? "var(--red)" : "var(--text)", fontWeight: sale.dueMinor > 0 ? 700 : 600 }}>
                      {formatAmount(sale.dueMinor)} {symbol}
                    </span>
                  }
                />
              </div>
            }
            footer={
              sale.dueMinor > 0 && customer ? (
                <Link href={`/customers/${customer.id}`} className="btn btn--success btn--block">
                  <Banknote size={16} />
                  <span>تسجيل دفعة من العميل</span>
                </Link>
              ) : null
            }
          />

          <Card
            title="معلومات الفاتورة"
            titleIcon={<Info size={18} />}
            body={
              <div className="stack" style={{ gap: 2 }}>
                <DetailRow label="رقم الفاتورة" value={sale.number} />
                <DetailRow label="تاريخ الإنشاء" value={formatDateTime(sale.createdAt)} />
                <DetailRow label="آخر تحديث" value={formatDateTime(sale.updatedAt)} />
                <DetailRow label="عدد الأصناف" value={sale.itemCount.toString()} />
                <DetailRow label="عدد الوحدات" value={(sale.unitCount ?? items.reduce((sum, item) => sum + item.quantity, 0)).toString()} />
              </div>
            }
          />

          <Card
            title="سجل الفاتورة"
            titleIcon={<History size={18} />}
            body={
              <div className="timeline">
                {timeline.map((entry, idx) => (
                  <div key={idx} className="timeline__item">
                    <div
                      className="timeline__dot"
                      style={
                        entry.tone === "red"
                          ? { background: "var(--red)", boxShadow: "0 0 0 3px var(--red-soft)" }
                          : undefined
                      }
                    />
                    <div>
                      <div className="timeline__title">{entry.title}</div>
                      <div className="timeline__meta">{formatDateTime(entry.at)}</div>
                      <div className="timeline__meta">{entry.actor}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="إلغاء الفاتورة"
        message={`سيتم إرجاع ${items.length} صنفاً إلى المخزون وتسجيل حركة لكل صنف. الفاتورة تبقى في السجل بحالة «ملغاة» ولا تُحذف نهائياً.`}
        confirmLabel="إلغاء الفاتورة"
        tone="danger"
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />

      {printModalOpen && (
        <div className="modal-region" onClick={() => setPrintModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3 className="modal__title">طباعة الفاتورة</h3>
            </div>
            <div className="modal__body">
              <div className="field">
                <label className="field__label">قالب الطباعة</label>
                <select
                  className="select"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value={TEMPLATES.A4}>{TEMPLATE_LABEL[TEMPLATES.A4]}</option>
                  <option value={TEMPLATES.THERMAL}>{TEMPLATE_LABEL[TEMPLATES.THERMAL]}</option>
                </select>
              </div>
              <AlertBox type="info">
                لحفظ الفاتورة كملف PDF، اختر «حفظ كـ PDF» من قائمة الطابعات في مربع الطباعة.
              </AlertBox>
            </div>
            <div className="modal__foot">
              <Button onClick={() => { toastOk("جارٍ الطباعة..."); setPrintModalOpen(false); }}>
                <Printer size={16} />
                <span>طباعة</span>
              </Button>
              <Button variant="ghost" onClick={() => setPrintModalOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
