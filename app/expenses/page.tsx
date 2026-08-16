"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Pencil,
  Eye,
  Wallet,
  CalendarDays,
  TrendingUp,
  Tag,
  FileText,
  X,
} from "lucide-react";
import { Card, Badge, EmptyState, AlertBox, Button, SearchField, Field, Pagination, Kpi, KpiGrid } from "@/components/ui";
import { DataTable, ThumbCell, ActionButtons, ActionButton } from "@/components/table";
import { Modal, ConfirmDialog, Panel, useToast } from "@/components/feedback";
import { FileDrop } from "@/components/ui/FileDrop";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/StoreProvider";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/app/actions/expenses";
import type { Expense } from "@/repositories/expenses.repository";

const SYMBOL = "ر.س";

const MOCK_CATEGORIES = [
  { id: "c1", name: "إيجار", color: "#DC2626" },
  { id: "c2", name: "رواتب", color: "#7C5CE0" },
  { id: "c3", name: "مشتريات", color: "#0E9C8A" },
  { id: "c4", name: "صيانة", color: "#B45309" },
  { id: "c5", name: "خدمات", color: "#1B63E3" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bank", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
];

export default function ExpensesPage() {
  const toast = useToast();
  const { storeId } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState(`${thisMonth}-01`);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const categoryById = useMemo(() => new Map(MOCK_CATEGORIES.map(c => [c.id, c])), []);

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      if (category !== "all" && expense.categoryId !== category) return false;
      if (from && expense.dayKey < from) return false;
      if (to && expense.dayKey > to) return false;
      if (!query.trim()) return true;
      const cat = categoryById.get(expense.categoryId)?.name || "";
      return `${expense.title || ""} ${expense.reference || ""} ${expense.note || ""} ${cat}`
        .toLowerCase().includes(query.toLowerCase());
    });
  }, [expenses, category, from, to, query, categoryById]);

  const kpis = useMemo(() => {
    const rows = filtered;
    const sum = (list: Expense[]) => list.reduce((total, e) => total + e.amountMinor, 0);
    const average = rows.length > 0 ? Math.round(sum(rows) / rows.length) : 0;
    const byCategory = new Map<string, number>();
    for (const expense of rows) {
      byCategory.set(expense.categoryId, (byCategory.get(expense.categoryId) || 0) + expense.amountMinor);
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    const todayTotal = expenses.filter((e) => e.dayKey === today);
    const monthTotal = expenses.filter((e) => e.dayKey.startsWith(thisMonth));

    return [
      { label: "متوسط المصروف", value: (average / 100).toFixed(2), unit: SYMBOL, iconName: "trending", tone: "amber" as const, subtext: "للمصروف الواحد" },
      { label: "أعلى فئة", value: top ? categoryById.get(top[0])?.name || "أخرى" : "—", iconName: "tag", tone: "violet" as const, subtext: top ? `${(top[1] / 100).toFixed(2)} ${SYMBOL}` : "لا مصروفات" },
      { label: "مصروفات الشهر", value: (sum(monthTotal) / 100).toFixed(2), unit: SYMBOL, iconName: "calendar", tone: "green" as const, subtext: `عدد ${monthTotal.length}` },
      { label: "مصروفات اليوم", value: (sum(todayTotal) / 100).toFixed(2), unit: SYMBOL, iconName: "calendar", tone: "blue" as const, subtext: `عدد ${todayTotal.length}` },
    ];
  }, [filtered, expenses, today, thisMonth, categoryById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      try {
        const data = await getExpenses(storeId);
        setExpenses(data);
      } catch (error) {
        toast.toastError("تعذّر تحميل المصروفات");
      }
    }
    load();
  }, [storeId]);

  const openExpensePanel = (expense: Expense | null = null) => {
    setEditingExpense(expense);
    setShowPanel(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !storeId) return;
    try {
      await deleteExpense(storeId, deleteConfirm);
      setExpenses((prev) => prev.filter((e) => e.id !== deleteConfirm));
      toast.toastOk("تم حذف المصروف");
    } catch {
      toast.toastError("تعذّر حذف المصروف");
    }
    setDeleteConfirm(null);
  };

  const handleSave = async () => {
    if (!storeId || !editingExpense) return;
    try {
      if (editingExpense.id && expenses.some(e => e.id === editingExpense.id)) {
        await updateExpense(storeId, editingExpense.id, editingExpense);
        toast.toastOk("تم حفظ التعديلات");
      } else {
        const created = await createExpense(storeId, editingExpense);
        setExpenses((prev) => [...prev, created]);
        toast.toastOk("تم تسجيل المصروف");
      }
    } catch {
      toast.toastError("تعذّر حفظ المصروف");
    }
    setShowPanel(false);
    setEditingExpense(null);
  };

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button onClick={() => openExpensePanel()} className="btn--success">
            <Plus size={18} />
            <span>إضافة مصروف</span>
          </Button>
        </div>
      </div>

      <KpiGrid>
        {kpis.map((kpi, i) => (
          <Kpi key={i} {...kpi} />
        ))}
      </KpiGrid>

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="field">
            <label className="field__label">بحث</label>
            <SearchField
              placeholder="بحث في المصروفات"
              value={query}
              onSearch={setQuery}
            />
          </div>
          <Field
            label="من تاريخ"
            name="from"
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
          <Field
            label="إلى تاريخ"
            name="to"
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
          <Field
            label="الفئة"
            name="category"
            value={category}
            options={[{ value: "all", label: "الكل" }, ...MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }))]}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
          <div className="filter-bar__actions">
            <Button variant="ghost" onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              const thisMonth = new Date().toISOString().slice(0, 7);
              setQuery(""); setCategory("all"); setFrom(`${thisMonth}-01`); setTo(today); setPage(1);
            }}>
              <X size={16} />
              <span>مسح الفلاتر</span>
            </Button>
            <Button variant="ghost" onClick={() => toast.toastOk("تم تصدير المصروفات إلى ملف Excel")}>
              <Download size={16} />
              <span>تصدير Excel</span>
            </Button>
          </div>
        </div>
      </div>

      <Card flush>
        <DataTable
          caption="قائمة المصروفات"
          columns={[
            { key: "createdAt", label: "التاريخ", render: (e: Expense) => e.dayKey },
            {
              key: "categoryId",
              label: "الفئة",
              render: (e: Expense) => {
                const cat = categoryById.get(e.categoryId);
                return (
                  <span className="row" style={{ gap: "8px", flexWrap: "nowrap" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: cat?.color || "var(--text-3)", flex: "none" }} />
                    <span style={{ fontWeight: 600 }}>{cat?.name || "أخرى"}</span>
                  </span>
                );
              },
            },
            { key: "title", label: "البيان", render: (e: Expense) => e.title || "—" },
            { key: "method", label: "طريقة الدفع", render: (e: Expense) => PAYMENT_METHODS.find(m => m.value === e.method)?.label || e.method || "—" },
            { key: "amountMinor", label: "المبلغ", render: (e: Expense) => `${(e.amountMinor / 100).toFixed(2)} ${SYMBOL}` },
            {
              key: "actions",
              label: "الإجراءات",
              className: "is-actions",
              render: (e: Expense) => (
                <div className="table__actions">
                  <Button variant="ghost" size="sm" onClick={() => openExpensePanel(e)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          empty={
            expenses.length === 0
              ? { iconName: "expenses", title: "لا مصروفات مسجّلة", text: "سجّل مصروفاتك لتظهر في التقارير وحساب صافي الحركة." }
              : { iconName: "search", title: "لا نتائج في هذه الفترة", text: "جرّب توسيع نطاق التاريخ أو تغيير الفئة." }
          }
        />
        {filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            unit="مصروف"
            onPage={setPage}
            onPageSize={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      {showPanel && (
        <Panel
          open={showPanel}
          title={editingExpense && expenses.some(e => e.id === editingExpense.id) ? "تعديل مصروف" : "إضافة مصروف جديد"}
          onClose={() => { setShowPanel(false); setEditingExpense(null); }}
          footer={
            <>
              <Button onClick={handleSave} className="btn--success btn--block">
                {editingExpense && expenses.some(e => e.id === editingExpense.id) ? "حفظ التعديلات" : "حفظ المصروف"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowPanel(false); setEditingExpense(null); }} className="btn--block">
                إلغاء
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: "16px" }}>
            <Field
              label="التاريخ"
              name="date"
              type="date"
              required
              value={editingExpense?.dayKey || today}
            />
            <Field
              label="الفئة"
              name="categoryId"
              required
              value={editingExpense?.categoryId || MOCK_CATEGORIES[0]?.id || ""}
              options={MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
            />
            <Field
              label="المبلغ"
              name="amount"
              required
              suffix={SYMBOL}
              placeholder="المبلغ"
              value={editingExpense ? (editingExpense.amountMinor / 100).toFixed(2) : ""}
            />
            <Field
              label="البيان"
              name="title"
              placeholder="وصف مختصر للمصروف"
              value={editingExpense?.title || ""}
            />
            <Field
              label="طريقة الدفع"
              name="method"
              value={editingExpense?.method || "cash"}
              options={PAYMENT_METHODS}
            />
            <Field
              label="رقم المرجع"
              name="reference"
              placeholder="أدخل رقم المرجع (اختياري)"
              value={editingExpense?.reference || ""}
            />
            <Field
              label="ملاحظة"
              name="note"
              rows={3}
              placeholder="أدخل ملاحظة (اختياري)"
              value={editingExpense?.note || ""}
            />
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="حذف المصروف"
        message="سيتم حذف المصروف نهائياً."
        confirmLabel="حذف"
        tone="danger"
      />
    </div>
  );
}
