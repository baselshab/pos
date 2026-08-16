"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Eye,
  Banknote,
  Pencil,
  Trash2,
  ChartBar,
  User,
  Search,
  Users,
  Wallet,
  Receipt,
} from "lucide-react";
import { Card, Badge, Button, EmptyState, SearchField, Pagination, Kpi, RowMenu, DetailRow, Avatar, AlertBox } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { Field } from "@/components/ui/Field";
import { useToast, ConfirmDialog } from "@/components/feedback";
import { useStore } from "@/components/providers/StoreProvider";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/app/actions/customers";
import type { Customer } from "@/repositories/customers.repository";

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSalesMap, setRecentSalesMap] = useState<Record<string, any[]>>({});

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [balance, setBalance] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const toast = useToast();
  const { storeId } = useStore();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (status === "active" && customer.isActive === false) return false;
      if (status === "inactive" && customer.isActive !== false) return false;

      if (!term) return true;
      return `${customer.name} ${customer.phone || ""}`.toLowerCase().includes(term);
    });
  }, [customers, query, status]);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await getCustomers(storeId);
        setCustomers(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (error) {
        toast.toastError("تعذّر تحميل العملاء");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  useEffect(() => {
    if (selectedId) {
      setRecentSalesMap((prev) => ({ ...prev, [selectedId]: [] }));
    }
  }, [selectedId]);

  const activeCount = customers.filter((c) => c.isActive !== false).length;

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedCustomerData = customers.find((c) => c.id === selectedId);

  const handleDelete = async () => {
    if (!selectedCustomer || !storeId) return;
    try {
      await deleteCustomer(storeId, selectedCustomer.id);
      setCustomers((prev) => prev.filter((c) => c.id !== selectedCustomer.id));
      if (selectedId === selectedCustomer.id) {
        setSelectedId(null);
      }
      toast.toastOk("تم حذف العميل");
    } catch {
      toast.toastError("تعذّر حذف العميل");
    }
    setConfirmOpen(false);
    setSelectedCustomer(null);
  };

  const handleSaveCustomer = async (name: string, phone: string, note: string) => {
    if (!storeId) return;
    try {
      if (editingCustomer) {
        const updated = await updateCustomer(storeId, editingCustomer.id, { name, phone, note });
        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? updated : c))
        );
        toast.toastOk("تم حفظ بيانات العميل");
      } else {
        const created = await createCustomer(storeId, { name, phone, note, isActive: true });
        setCustomers((prev) => [...prev, created]);
        toast.toastOk(`تمت إضافة "${name}"`);
      }
    } catch {
      toast.toastError("تعذّر حفظ العميل");
    }
    setFormOpen(false);
    setEditingCustomer(null);
  };

  const handleRecordPayment = (amount: string, method: string) => {
    if (!paymentCustomer) return;
    toast.toastOk(`تم تسجيل دفعة ${amount} من ${paymentCustomer.name}`);
    setPaymentOpen(false);
    setPaymentCustomer(null);
  };

  const applyFilters = () => {
    setPage(1);
  };

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button variant="teal" onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
            <Plus size={16} />
            <span>إضافة عميل</span>
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="إجمالي العملاء"
          value={String(customers.length)}
          unit="عميل"
          icon={<Users size={22} />}
          iconTone="violet"
        />
        <Kpi
          label="عملاء نشطون"
          value={String(activeCount)}
          unit="عميل"
          icon={<User size={22} />}
          iconTone="blue"
        />
      </div>

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="field">
            <label className="field__label">بحث في العملاء</label>
            <SearchField
              value={query}
              onChange={(v) => { setQuery(v); applyFilters(); }}
              placeholder="بحث بالاسم أو الهاتف"
            />
          </div>
          <div className="field">
            <label className="field__label">الحالة</label>
            <select
              className="select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); applyFilters(); }}
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
          <div className="filter-bar__actions">
            <Button variant="ghost" onClick={() => toast.toastOk("تم تصدير العملاء إلى ملف Excel")}>
              <Download size={16} />
              <span>تصدير Excel</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card flush body={<div className="skeleton" style={{ height: 300 }} />} />
      ) : (
        <div className="split-layout">
          <Card
            flush
            body={
              <div>
                <DataTable
                  caption="قائمة العملاء"
                  rowKey={(customer) => customer.id}
                  isSelected={(customer) => customer.id === selectedId}
                  onRowClick={(customer) => { setSelectedId(customer.id); }}
                  columns={[
                    {
                      key: "name",
                      label: "الاسم",
                      render: (customer: Customer) => (
                        <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                          <Avatar initials={initials(customer.name)} size="sm" />
                          <div>
                            <div className="table__main">{customer.name}</div>
                            {customer.isActive === false && <div className="table__sub">غير نشط</div>}
                          </div>
                        </div>
                      ),
                    },
                    { key: "phone", label: "الهاتف", render: (customer: Customer) => customer.phone || "—" },
                    {
                      key: "status",
                      label: "الحالة",
                      render: (customer: Customer) => (
                        <Badge tone={customer.isActive === false ? "gray" : "green"}>
                          {customer.isActive === false ? "غير نشط" : "نشط"}
                        </Badge>
                      ),
                    },
                    {
                      key: "actions",
                      label: "الإجراءات",
                      className: "is-actions",
                      render: (customer: Customer) => (
                        <RowMenu
                          align="end"
                          items={[
                            { label: "تسجيل دفعة", icon: <Banknote size={16} />, onClick: () => { setPaymentCustomer(customer); setPaymentOpen(true); } },
                            { label: "تعديل", icon: <Pencil size={16} />, onClick: () => { setEditingCustomer(customer); setFormOpen(true); } },
                            { label: "حذف", icon: <Trash2 size={16} />, danger: true, onClick: () => { setSelectedCustomer(customer); setConfirmOpen(true); } },
                          ]}
                        />
                      ),
                    },
                  ]}
                  rows={pageRows}
                  empty={
                    customers.length === 0
                      ? { iconName: "customers", title: "لا عملاء بعد", text: "أضف عميلاً لتتمكّن من البيع الآجل ومتابعة الذمم." }
                      : { title: "لا نتائج مطابقة", text: "جرّب تعديل البحث أو الفلاتر." }
                  }
                />
                {total > 0 && (
                  <Pagination
                    page={safePage}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                )}
              </div>
            }
          />

          <div className="detail-panel stack">
            {selectedCustomerData ? (
              <Card
                title="تفاصيل العميل"
                titleIcon={<User size={18} />}
                body={
                  <div className="stack">
                    <div className="row" style={{ gap: 12 }}>
                      <Avatar initials={initials(selectedCustomerData.name)} />
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700 }}>{selectedCustomerData.name}</h3>
                        {selectedCustomerData.isActive === false && <Badge tone="gray">غير نشط</Badge>}
                      </div>
                    </div>
                    <div className="stack" style={{ gap: 2 }}>
                      <DetailRow label="رقم الهاتف" value={selectedCustomerData.phone || "—"} icon={<Search size={15} />} />
                    </div>
                    {selectedCustomerData.note && <AlertBox type="info">{selectedCustomerData.note}</AlertBox>}
                  </div>
                }
                footer={
                  <div className="stack" style={{ gap: 8 }}>
                    <Button className="btn btn--success btn--block" onClick={() => { setPaymentCustomer(selectedCustomerData); setPaymentOpen(true); }}>
                      <Banknote size={16} />
                      <span>تسجيل دفعة</span>
                    </Button>
                    <Button variant="ghost" className="btn--block" onClick={() => { setEditingCustomer(selectedCustomerData); setFormOpen(true); }}>
                      <Pencil size={16} />
                      <span>تعديل</span>
                    </Button>
                    <Button variant="outline-danger" className="btn--block" onClick={() => { setSelectedCustomer(selectedCustomerData); setConfirmOpen(true); }}>
                      <Trash2 size={16} />
                      <span>حذف</span>
                    </Button>
                  </div>
                }
              />
            ) : (
              <Card
                body={
                  <EmptyState
                    iconName="user"
                    title="اختر عميلاً"
                    text="انقر على صف في الجدول لعرض تفاصيله."
                  />
                }
              />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="حذف العميل"
        message={selectedCustomer ? `سيتم حذف "${selectedCustomer.name}" نهائياً.` : ""}
        confirmLabel="حذف"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setSelectedCustomer(null); }}
      />

      {formOpen && (
        <CustomerFormModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
        />
      )}

      {paymentOpen && paymentCustomer && (
        <PaymentModal
          customer={paymentCustomer}
          onSave={handleRecordPayment}
          onClose={() => { setPaymentOpen(false); setPaymentCustomer(null); }}
        />
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return name.slice(0, 2).toUpperCase();
}

function CustomerFormModal({
  customer,
  onSave,
  onClose,
}: {
  customer: Customer | null;
  onSave: (name: string, phone: string, note: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [note, setNote] = useState(customer?.note || "");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name, phone, note);
  };

  return (
    <div className="modal-region" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">{customer ? "تعديل عميل" : "إضافة عميل جديد"}</h3>
        </div>
        <div className="modal__body">
          <div className="form-grid">
            <Field label="اسم العميل" required>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                autoFocus
              />
            </Field>
            <Field label="رقم الهاتف">
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
              />
            </Field>
            <Field label="ملاحظة" style={{ gridColumn: "1 / -1" }}>
              <textarea
                className="textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة اختيارية عن العميل"
                rows={3}
              />
            </Field>
          </div>
        </div>
        <div className="modal__foot">
          <Button onClick={handleSubmit}>حفظ</Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  customer,
  onSave,
  onClose,
}: {
  customer: Customer;
  onSave: (amount: string, method: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onSave(amount, method);
  };

  return (
    <div className="modal-region" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">تسجيل دفعة — {customer.name}</h3>
        </div>
        <div className="modal__body">
          <div className="form-grid">
            <Field label="المبلغ" required>
              <input
                type="number"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </Field>
            <Field label="طريقة الدفع">
              <select
                className="select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="modal__foot">
          <Button onClick={handleSubmit}>تسجيل الدفعة</Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}
