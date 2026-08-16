"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Download,
  Plus,
  Printer,
  Trash2,
  XCircle,
  MoreVertical,
  Eye,
  CreditCard,
  Wallet,
  Clock,
  TrendingUp,
  CheckCircle,
  User,
  ChevronLeft,
} from "lucide-react";
import { Card, Badge, Button, EmptyState, SearchField, Pagination, Kpi, RowMenu } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { ConfirmDialog, useToast } from "@/components/feedback";
import { useStore } from "@/components/providers/StoreProvider";
import { getSales, cancelSale } from "@/app/actions/sales";
import type { Sale } from "@/repositories/sales.repository";

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <CreditCard size={16} />,
  credit: <Wallet size={16} />,
};

export default function InvoicesPage() {
  const toast = useToast();
  const { storeId } = useStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customer, setCustomer] = useState("all");
  const [payment, setPayment] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await getSales(storeId);
        setSales(data);
      } catch (error) {
        toast.toastError("تعذّر تحميل الفواتير");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sales.filter((sale) => {
      if (customer !== "all" && sale.customerId !== customer) return false;
      if (payment !== "all" && sale.paymentType !== payment) return false;
      if (status !== "all" && sale.status !== status) return false;
      if (from && sale.dayKey < from) return false;
      if (to && sale.dayKey > to) return false;
      if (!term) return true;
      return `${sale.number} ${sale.customerName}`.toLowerCase().includes(term);
    });
  }, [sales, query, from, to, customer, payment, status]);

  const kpiData = useMemo(() => {
    const rows = filtered.filter((sale) => sale.status !== 'cancelled');
    const total = rows.reduce((sum, sale) => sum + sale.totalMinor, 0);
    const paid = rows.reduce((sum, sale) => sum + sale.paidMinor, 0);
    const due = rows.reduce((sum, sale) => sum + sale.dueMinor, 0);
    return { total, paid, due };
  }, [filtered]);

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCancel = async () => {
    if (!selectedSale || !storeId) return;
    try {
      await cancelSale(storeId, selectedSale.id, "إلغاء من قائمة الفواتير");
      setSales((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id
            ? { ...s, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: "إلغاء من قائمة الفواتير" }
            : s
        )
      );
      toast.toastOk(`تم إلغاء الفاتورة`);
      setConfirmOpen(false);
      setSelectedSale(null);
    } catch {
      toast.toastError("تعذّر إلغاء الفاتورة");
    }
  };

  const handleExport = () => {
    toast.toastOk("تم تصدير الفواتير إلى ملف Excel");
  };

  const applyFilters = () => {
    setPage(1);
  };

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Link href="/pos" className="btn btn--primary">
            <Plus size={16} />
            <span>فاتورة جديدة</span>
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          variant="tinted"
          tone="blue"
          label="إجمالي المبيعات"
          value={`${(kpiData.total / 100).toFixed(2)} ر.س`}
          icon={<TrendingUp size={22} />}
          iconTone="blue"
        />
        <Kpi
          variant="tinted"
          tone="green"
          label="مدفوع"
          value={`${(kpiData.paid / 100).toFixed(2)} ر.س`}
          icon={<CheckCircle size={22} />}
          iconTone="green"
        />
        <Kpi
          variant="tinted"
          tone="amber"
          label="آجل"
          value={`${(kpiData.due / 100).toFixed(2)} ر.س`}
          icon={<Clock size={22} />}
          iconTone="amber"
        />
      </div>

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="field">
            <label className="field__label">بحث في الفواتير</label>
            <SearchField
              value={query}
              onChange={(v) => { setQuery(v); applyFilters(); }}
              placeholder="بحث برقم الفاتورة أو العميل"
            />
          </div>
          <div className="field">
            <label className="field__label">من تاريخ</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => { setFrom(e.target.value); applyFilters(); }}
            />
          </div>
          <div className="field">
            <label className="field__label">إلى تاريخ</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => { setTo(e.target.value); applyFilters(); }}
            />
          </div>
        </div>
        <div className="filter-bar__row">
          <div className="field">
            <label className="field__label">نوع الدفع</label>
            <select
              className="select"
              value={payment}
              onChange={(e) => { setPayment(e.target.value); applyFilters(); }}
            >
              <option value="all">الكل</option>
              <option value="cash">نقدي</option>
              <option value="credit">آجل</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label">الحالة</label>
            <select
              className="select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); applyFilters(); }}
            >
              <option value="all">الكل</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
          <div />
          <div className="filter-bar__actions">
            <Button variant="ghost" onClick={handleExport}>
              <Download size={16} />
              <span>تصدير Excel</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card flush body={<div className="skeleton" style={{ height: 200 }} />} />
      ) : (
        <Card
          flush
          body={
            <div>
              <DataTable
                caption="قائمة الفواتير"
                columns={[
                  {
                    key: "number",
                    label: "رقم الفاتورة",
                    render: (sale: Sale) => (
                      <Link href={`/invoices/${sale.id}`} className="btn btn--quiet" style={{ padding: 0 }}>
                        {sale.number}
                      </Link>
                    ),
                  },
                  { key: "dayKey", label: "التاريخ", render: (sale: Sale) => sale.dayKey },
                  { key: "customerName", label: "العميل" },
                  { key: "id", label: "الأصناف", render: (sale: Sale) => `${sale.itemCount} أصناف` },
                  {
                    key: "paymentType",
                    label: "نوع الدفع",
                    render: (sale: Sale) => (
                      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        {PAYMENT_ICONS[sale.paymentType]}
                        <span>{sale.paymentType === 'cash' ? 'نقدي' : 'آجل'}</span>
                      </span>
                    ),
                  },
                  {
                    key: "totalMinor",
                    label: "الإجمالي",
                    render: (sale: Sale) => (
                      <span style={{ fontWeight: 600 }}>
                        {(sale.totalMinor / 100).toFixed(2)} ر.س
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "الحالة",
                    render: (sale: Sale) => (
                      <Badge tone={sale.status === 'cancelled' ? "gray" : "green"}>{sale.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}</Badge>
                    ),
                  },
                  {
                    key: "actions",
                    label: "الإجراءات",
                    className: "is-actions",
                    render: (sale: Sale) => (
                      <RowMenu
                        align="end"
                        items={[
                          { label: "عرض التفاصيل", icon: <Eye size={16} />, onClick: () => {} },
                          { label: "طباعة", icon: <Printer size={16} />, onClick: () => { setPrintSale(sale); setPrintModalOpen(true); } },
                          sale.status !== 'cancelled'
                            ? { label: "إلغاء الفاتورة", icon: <XCircle size={16} />, danger: true, onClick: () => { setSelectedSale(sale); setConfirmOpen(true); } }
                            : null,
                        ].filter(Boolean) as any}
                      />
                    ),
                  },
                ]}
                rows={pageRows}
                empty={
                  sales.length === 0
                    ? { iconName: "invoices", title: "لا فواتير بعد", text: "أتمم أول عملية بيع من نقطة البيع لتظهر الفاتورة هنا." }
                    : { title: "لا نتائج مطابقة", text: "جرّب تغيير الفلاتر أو نطاق التاريخ." }
                }
              />
              {total > 0 && (
                <Pagination
                  page={safePage}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                  pageSizeOptions={[8, 20, 50, 100]}
                />
              )}
            </div>
          }
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="إلغاء الفاتورة"
        message={selectedSale ? `سيتم إلغاء الفاتورة ${selectedSale.number}` : ""}
        confirmLabel="إلغاء الفاتورة"
        tone="danger"
        onConfirm={handleCancel}
        onCancel={() => { setConfirmOpen(false); setSelectedSale(null); }}
      />

      {printSale && (
        <div className="modal-region" onClick={() => setPrintModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3 className="modal__title">طباعة الفاتورة</h3>
            </div>
            <div className="modal__body">
              <p>قالب الطباعة: A4</p>
              <p style={{ fontSize: "12px", color: "var(--text-2)", marginTop: 8 }}>
                لحفظ الفاتورة كملف PDF، اختر «حفظ كـ PDF» من قائمة الطابعات في مربع الطباعة.
              </p>
            </div>
            <div className="modal__foot">
              <Button onClick={() => { toast.toastOk("جارٍ الطباعة..."); setPrintModalOpen(false); }}>
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
