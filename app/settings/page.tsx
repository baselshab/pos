"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Store,
  Receipt,
  Percent,
  Tag,
  Database,
  Save,
  X,
  RefreshCw,
  Shield,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Upload,
  Download,
  Trash2,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { Card, Badge, AlertBox, Button, Field, ToggleField, ProgressBar, DetailRow } from "@/components/ui";
import { Modal, ConfirmDialog, useToast } from "@/components/feedback";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/StoreProvider";
import { getSettings, updateSettings } from "@/app/actions/settings";

const SECTIONS = [
  { id: "general", label: "عام", icon: Settings },
  { id: "store", label: "بيانات المتجر", icon: Store },
  { id: "invoices", label: "الفواتير", icon: Receipt },
  { id: "taxes", label: "الضرائب", icon: Percent },
  { id: "catalog", label: "الفئات والأسباب", icon: Tag },
  { id: "data", label: "البيانات والأوفلاين", icon: Database },
];

const CURRENCIES = [
  { code: "SAR", symbol: "ر.س", label: "ريال سعودي (SAR)" },
  { code: "EGP", symbol: "ج.م", label: "جنيه مصري (EGP)" },
  { code: "AED", symbol: "د.إ", label: "درهم إماراتي (AED)" },
  { code: "KWD", symbol: "د.ك", label: "دينار كويتي (KWD)" },
  { code: "QAR", symbol: "ر.ق", label: "ريال قطري (QAR)" },
  { code: "JOD", symbol: "د.أ", label: "دينار أردني (JOD)" },
  { code: "IQD", symbol: "د.ع", label: "دينار عراقي (IQD)" },
  { code: "USD", symbol: "$", label: "دولار أمريكي (USD)" },
];

const MOCK_PRODUCT_CATEGORIES = [
  { id: "c1", name: "مشروبات", color: "#0E9C8A" },
  { id: "c2", name: "أغذية", color: "#1B63E3" },
  { id: "c3", name: "تنظيف", color: "#B45309" },
  { id: "c4", name: "مكتبية", color: "#7C5CE0" },
];

const MOCK_EXPENSE_CATEGORIES = [
  { id: "ec1", name: "إيجار", color: "#EF4444" },
  { id: "ec2", name: "رواتب", color: "#F59E0B" },
  { id: "ec3", name: "مصروفات عامة", color: "#8B5CF6" },
];

const MOCK_REASONS = [
  { id: "r1", name: "جرد", active: true },
  { id: "r2", name: "تسوية", active: true },
  { id: "r3", name: "مرتجع", active: true },
  { id: "r4", name: "تالف", active: true },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function percentToBp(percent: number) {
  return Math.round(percent * 100);
}

function bpToPercent(bp: number) {
  return (bp / 100).toFixed(0);
}

export default function SettingsPage() {
  const toast = useToast();
  const { storeId } = useStore();
  const [activeSection, setActiveSection] = useState("general");
  const [s, setS] = useState({
    storeName: "متجر السعادة",
    storePhone: "+966 50 123 4567",
    storeEmail: "info@store.com",
    storeAddress: "الرياض، حي النخيل، شارع الملك فهد",
    storeCrNumber: "1010XXXXXX",
    storeTaxNumber: "3100XXXXXX",
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    dateFormat: "yyyy-MM-dd",
    invoicePrefix: "INV",
    invoiceNextNumber: 1,
    invoiceFooter: "شكراً لتعاملكم معنا",
    printTemplate: "a4",
    defaultTaxRateBp: 1500,
    maxDiscountPercent: 30,
    lowStockDefault: 5,
    backupReminder: "weekly",
    taxInclusive: false,
    allowDiscount: true,
    allowNegativeStock: false,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const storage = { usage: 6500000, quota: 10000000, persisted: true };

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      try {
        const values = await getSettings(storeId);
        if (values && Object.keys(values).length > 0) {
          setS((prev) => ({ ...prev, ...values }));
        }
      } catch (error) {
        // use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) return;
    try {
      await updateSettings(storeId, s);
      setSaved(true);
      toast.toastOk("تم حفظ الإعدادات");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.toastError("تعذّر حفظ الإعدادات");
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "store":
        return (
          <Card title="بيانات المتجر" titleIcon={<Store size={20} />}>
            <div className="stack" style={{ gap: "16px" }}>
              <div className="form-grid">
                <Field label="اسم المتجر" name="storeName" required value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
                <Field label="رقم الهاتف" name="storePhone" type="tel" value={s.storePhone} onChange={(e) => setS({ ...s, storePhone: e.target.value })} />
                <Field label="البريد الإلكتروني" name="storeEmail" type="email" value={s.storeEmail} onChange={(e) => setS({ ...s, storeEmail: e.target.value })} />
              </div>
              <Field label="العنوان" name="storeAddress" value={s.storeAddress} onChange={(e) => setS({ ...s, storeAddress: e.target.value })} />
              <div className="form-grid--2">
                <Field label="السجل التجاري" name="storeCrNumber" value={s.storeCrNumber} onChange={(e) => setS({ ...s, storeCrNumber: e.target.value })} />
                <Field label="الرقم الضريبي" name="storeTaxNumber" value={s.storeTaxNumber} onChange={(e) => setS({ ...s, storeTaxNumber: e.target.value })} />
              </div>
              <AlertBox tone="info">هذه البيانات تظهر في رأس الفواتير المطبوعة.</AlertBox>
            </div>
          </Card>
        );

      case "invoices":
        return (
          <Card title="الفواتير" titleIcon={<Receipt size={20} />}>
            <div className="stack" style={{ gap: "16px" }}>
              <div className="form-grid">
                <Field label="تنسيق التاريخ" name="dateFormat" value={s.dateFormat} options={[
                  { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
                  { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
                  { value: "yyyy/MM/dd", label: "YYYY/MM/DD" },
                ]} onChange={(e) => setS({ ...s, dateFormat: e.target.value })} />
                <Field label="بادئة الفاتورة" name="invoicePrefix" required value={s.invoicePrefix} onChange={(e) => setS({ ...s, invoicePrefix: e.target.value })} />
                <Field label="الرقم التالي" name="invoiceNextNumber" type="number" value={String(s.invoiceNextNumber)} onChange={(e) => setS({ ...s, invoiceNextNumber: Number(e.target.value) })} />
              </div>
              <Field label="نص تذييل الفاتورة" name="invoiceFooter" value={s.invoiceFooter} onChange={(e) => setS({ ...s, invoiceFooter: e.target.value })} />
              <div className="form-grid--2">
                <Field label="قالب الطباعة الافتراضي" name="printTemplate" value={s.printTemplate} options={[
                  { value: "a4", label: "A4" },
                  { value: "thermal", label: "حراري 80mm" },
                ]} onChange={(e) => setS({ ...s, printTemplate: e.target.value })} />
                <div className="field">
                  <span className="field__label">السماح بالخصم</span>
                  <ToggleField label="السماح بالخصم" checked={s.allowDiscount} onChange={(checked) => setS({ ...s, allowDiscount: checked })} />
                </div>
              </div>
              <AlertBox tone="info">
                شكل رقم الفاتورة القادم: {s.invoicePrefix}-{new Date().getFullYear()}-{String(s.invoiceNextNumber).padStart(5, "0")}
              </AlertBox>
            </div>
          </Card>
        );

      case "taxes":
        return (
          <Card title="الضرائب والخصم" titleIcon={<Percent size={20} />}>
            <div className="stack" style={{ gap: "16px" }}>
              <div className="form-grid">
                <Field label="الضريبة الافتراضية" name="defaultTaxRate" value={bpToPercent(s.defaultTaxRateBp)} options={[
                  { value: "0", label: "معفى (0%)" },
                  { value: "5", label: "5%" },
                  { value: "10", label: "10%" },
                  { value: "14", label: "14% - ضريبة القيمة المضافة" },
                  { value: "15", label: "15% - ضريبة القيمة المضافة" },
                ]} onChange={(e) => setS({ ...s, defaultTaxRateBp: percentToBp(Number(e.target.value)) })} />
                <Field label="الحد الأقصى للخصم" name="maxDiscountPercent" type="number" value={String(s.maxDiscountPercent)} suffix="%" onChange={(e) => setS({ ...s, maxDiscountPercent: Number(e.target.value) })} />
                <Field label="حد المخزون المنخفض الافتراضي" name="lowStockDefault" type="number" value={String(s.lowStockDefault)} onChange={(e) => setS({ ...s, lowStockDefault: Number(e.target.value) })} />
              </div>
              <div className="stack" style={{ gap: "14px" }}>
                <ToggleField label="الأسعار المدخلة شاملة الضريبة" checked={s.taxInclusive} onChange={(checked) => setS({ ...s, taxInclusive: checked })} />
                <ToggleField label="السماح بالبيع عند نفاد المخزون" checked={s.allowNegativeStock} onChange={(checked) => setS({ ...s, allowNegativeStock: checked })} />
              </div>
              <AlertBox tone="warn">تغيير نسبة الضريبة يؤثر على الفواتير الجديدة فقط. الفواتير السابقة تحتفظ بالنسبة المستخدمة وقت إصدارها.</AlertBox>
            </div>
          </Card>
        );

      case "catalog":
        return (
          <div className="stack" style={{ gap: "16px" }}>
            <Card title="فئات المنتجات" titleIcon={<Tag size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <div className="chips">
                  {MOCK_PRODUCT_CATEGORIES.map((cat) => (
                    <span key={cat.id} className="chip" style={{ cursor: "default" }}>
                      {cat.color && <span className="badge__dot" style={{ background: cat.color, width: "9px", height: "9px" }} />}
                      <span>{cat.name}</span>
                      <button className="icon-btn" style={{ width: "24px", height: "24px" }} onClick={() => toast.toastOk(`تم حذف ${cat.name}`)}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="row">
                  <input className="input" placeholder="اسم جديد" style={{ flex: 1 }} />
                  <Button variant="outline"><Plus size={16} /><span>إضافة</span></Button>
                </div>
              </div>
            </Card>

            <Card title="فئات المصروفات" titleIcon={<Receipt size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <div className="chips">
                  {MOCK_EXPENSE_CATEGORIES.map((cat) => (
                    <span key={cat.id} className="chip" style={{ cursor: "default" }}>
                      {cat.color && <span className="badge__dot" style={{ background: cat.color, width: "9px", height: "9px" }} />}
                      <span>{cat.name}</span>
                      <button className="icon-btn" style={{ width: "24px", height: "24px" }} onClick={() => toast.toastOk(`تم حذف ${cat.name}`)}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="row">
                  <input className="input" placeholder="اسم جديد" style={{ flex: 1 }} />
                  <Button variant="outline"><Plus size={16} /><span>إضافة</span></Button>
                </div>
              </div>
            </Card>

            <Card title="أسباب تسوية المخزون" titleIcon={<Tag size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <div className="chips">
                  {MOCK_REASONS.map((reason) => (
                    <span key={reason.id} className="chip" style={{ cursor: "default" }}>
                      <span>{reason.name}</span>
                      <button className="icon-btn" style={{ width: "24px", height: "24px" }} onClick={() => toast.toastOk(`تم تعطيل ${reason.name}`)}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="row">
                  <input className="input" placeholder="اسم جديد" style={{ flex: 1 }} />
                  <Button variant="outline"><Plus size={16} /><span>إضافة</span></Button>
                </div>
              </div>
            </Card>
          </div>
        );

      case "data":
        return (
          <div className="stack" style={{ gap: "16px" }}>
            <Card title="العمل دون اتصال" titleIcon={<Shield size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <AlertBox tone="ok">التطبيق مؤهّل للعمل دون اتصال. بعد أول زيارة تُخزَّن ملفاته محلياً ويعمل بلا إنترنت.</AlertBox>
                <div className="stack" style={{ gap: "2px" }}>
                  <DetailRow label="حالة Service Worker" value={<Badge tone="green">نشط</Badge>} />
                  <DetailRow label="إصدار Cache" value="1.0.0" />
                  <DetailRow label="إصدار التطبيق" value="v1.0.0" />
                  <DetailRow label="إصدار مخطط البيانات" value="1" />
                  <DetailRow label="السياق آمن (HTTPS/localhost)" value={<Badge tone="green">نعم</Badge>} />
                </div>
              </div>
            </Card>

            <Card title="مساحة التخزين المحلي" titleIcon={<Database size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <div className="stack" style={{ gap: "10px" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="field__hint">{formatBytes(storage.usage)} من {formatBytes(storage.quota)}</span>
                    <span style={{ fontWeight: 700 }}>{Math.round((storage.usage / storage.quota) * 100)}%</span>
                  </div>
                  <ProgressBar value={storage.usage / storage.quota} />
                </div>
                <DetailRow label="التخزين الدائم" value={<Badge tone="green">مفعّل</Badge>} />
                <AlertBox tone="warn">بدون التخزين الدائم قد يحذف المتصفح البيانات عند ضغط مساحة الجهاز.</AlertBox>
              </div>
            </Card>

            <Card title="النسخ الاحتياطي" titleIcon={<Shield size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <Field label="تذكير النسخ الاحتياطي" name="backupReminder" value={s.backupReminder} options={[
                  { value: "off", label: "معطّل" },
                  { value: "daily", label: "يومي" },
                  { value: "weekly", label: "أسبوعي" },
                ]} onChange={(e) => setS({ ...s, backupReminder: e.target.value })} />
                <AlertBox tone="warn">بياناتك محفوظة في متصفح هذا الجهاز على هذا النطاق فقط. النسخ الاحتياطي مسؤولية تشغيلية أساسية.</AlertBox>
              </div>
            </Card>

            <Card title="بيانات تجريبية" titleIcon={<Zap size={20} />}>
              <div className="stack" style={{ gap: "12px" }}>
                <p className="field__hint">أضف منتجات وعملاء ومبيعات للتجربة. لا تفعل هذا على قاعدة بيانات حقيقية.</p>
                <Button variant="outline" onClick={() => toast.toastOk("تمت إضافة بيانات تجريبية")}>
                  <Zap size={18} />
                  <span>إضافة بيانات تجريبية</span>
                </Button>
              </div>
            </Card>
          </div>
        );

      case "general":
      default:
        return (
          <div className="stack" style={{ gap: "16px" }}>
            <Card title="بيانات المتجر" titleIcon={<Store size={20} />}>
              <div className="stack" style={{ gap: "16px" }}>
                <div className="form-grid">
                  <Field label="اسم المتجر" name="storeName" required value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
                  <Field label="رقم الهاتف" name="storePhone" type="tel" value={s.storePhone} onChange={(e) => setS({ ...s, storePhone: e.target.value })} />
                  <Field label="البريد الإلكتروني" name="storeEmail" type="email" value={s.storeEmail} onChange={(e) => setS({ ...s, storeEmail: e.target.value })} />
                </div>
                <Field label="العنوان" name="storeAddress" value={s.storeAddress} onChange={(e) => setS({ ...s, storeAddress: e.target.value })} />
                <div className="form-grid--2">
                  <Field label="العملة" name="currencyCode" value={s.currencyCode} options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))} onChange={(e) => {
                    const currency = CURRENCIES.find(c => c.code === e.target.value);
                    if (currency) setS({ ...s, currencyCode: e.target.value, currencySymbol: currency.symbol });
                  }} />
                  <Field label="رمز العملة" name="currencySymbol" required value={s.currencySymbol} onChange={(e) => setS({ ...s, currencySymbol: e.target.value })} />
                </div>
              </div>
            </Card>

            <Card title="الفواتير" titleIcon={<Receipt size={20} />}>
              <div className="stack" style={{ gap: "16px" }}>
                <div className="form-grid">
                  <Field label="تنسيق التاريخ" name="dateFormat" value={s.dateFormat} options={[
                    { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
                    { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
                  ]} onChange={(e) => setS({ ...s, dateFormat: e.target.value })} />
                  <Field label="بادئة الفاتورة" name="invoicePrefix" required value={s.invoicePrefix} onChange={(e) => setS({ ...s, invoicePrefix: e.target.value })} />
                  <Field label="الرقم التالي" name="invoiceNextNumber" type="number" value={String(s.invoiceNextNumber)} onChange={(e) => setS({ ...s, invoiceNextNumber: Number(e.target.value) })} />
                </div>
                <Field label="نص تذييل الفاتورة" name="invoiceFooter" value={s.invoiceFooter} onChange={(e) => setS({ ...s, invoiceFooter: e.target.value })} />
                <div className="form-grid">
                  <Field label="الضريبة الافتراضية" name="defaultTaxRate" value={bpToPercent(s.defaultTaxRateBp)} options={[
                    { value: "0", label: "معفى (0%)" },
                    { value: "5", label: "5%" },
                    { value: "10", label: "10%" },
                    { value: "15", label: "15% - ضريبة القيمة المضافة" },
                  ]} onChange={(e) => setS({ ...s, defaultTaxRateBp: percentToBp(Number(e.target.value)) })} />
                  <div className="field">
                    <span className="field__label">السماح بالخصم</span>
                  <ToggleField label="السماح بالخصم" checked={s.allowDiscount} onChange={(checked) => setS({ ...s, allowDiscount: checked })} />
                  </div>
                  <Field label="قالب الطباعة" name="printTemplate" value={s.printTemplate} options={[
                    { value: "a4", label: "A4" },
                    { value: "thermal", label: "حراري 80mm" },
                  ]} onChange={(e) => setS({ ...s, printTemplate: e.target.value })} />
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="أقسام الإعدادات">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              className={cn("settings-nav__item", isActive && "settings-nav__item--active")}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveSection(section.id)}
            >
              <Icon size={20} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="settings-layout__form">
        {renderSection()}
      </div>

      <div className="settings-layout__side stack">
        <Card title="حالة التطبيق">
          <div className="stack" style={{ gap: "2px" }}>
            <DetailRow label="Service Worker" value={<Badge tone="green">نشط</Badge>} />
            <DetailRow label="إصدار Cache" value="1.0.0" />
          </div>
        </Card>
        <Card>
          <div className="alert alert--ok" style={{ border: "none" }}>
            <CheckCircle size={20} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: "3px" }}>جاهز دون اتصال</div>
              <div>يمكنك متابعة العمل بلا إنترنت. كل البيانات محلية.</div>
            </div>
          </div>
        </Card>
        <Card title="مساحة التخزين المحلي">
          <div className="stack" style={{ gap: "10px" }}>
            <ProgressBar value={storage.usage / storage.quota} />
            <p className="field__hint">
              {formatBytes(storage.usage)} / {formatBytes(storage.quota)} ({Math.round((storage.usage / storage.quota) * 100)}%)
            </p>
          </div>
        </Card>
      </div>

      <div className="form-actions">
        <Button onClick={handleSave} className="btn--success">
          <Save size={18} />
          <span>حفظ التغييرات</span>
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          <X size={18} />
          <span>إلغاء</span>
        </Button>
      </div>
    </div>
  );
}
