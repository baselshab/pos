"use client";

import { useState, useEffect } from "react";
import {
  CloudUpload,
  Download,
  Shield,
  Trash2,
  CalendarDays,
  Database,
  Layers,
  Bell,
  FileText,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Upload,
  History,
} from "lucide-react";
import { Card, Badge, EmptyState, AlertBox, Button, Field, Pagination, Kpi, KpiGrid, ProgressBar, CheckboxField } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { Modal, ConfirmDialog, useToast } from "@/components/feedback";
import { cn } from "@/lib/utils";

const SYMBOL = "ر.س";

const BACKUP_KIND = { AUTO: "auto", MANUAL: "manual" };

const STORE_LABELS = [
  ["products", "المنتجات"],
  ["categories", "الفئات"],
  ["customers", "العملاء"],
  ["sales", "الفواتير"],
  ["saleItems", "سطور الفواتير"],
  ["payments", "المدفوعات"],
  ["expenses", "المصروفات"],
  ["expenseCategories", "فئات المصروفات"],
  ["inventoryMovements", "حركات المخزون"],
  ["suspendedSales", "البيوع المعلّقة"],
  ["adjustmentReasons", "أسباب التسوية"],
  ["settings", "الإعدادات"],
];

const MOCK_BACKUPS = [
  { id: "b1", fileName: "backup-2026-08-14.json", createdAt: "2026-08-14T10:00:00Z", sizeBytes: 245000, kind: BACKUP_KIND.MANUAL, hasPayload: true },
  { id: "b2", fileName: "backup-2026-08-07.json", createdAt: "2026-08-07T10:00:00Z", sizeBytes: 230000, kind: BACKUP_KIND.AUTO, hasPayload: true },
  { id: "b3", fileName: "backup-2026-07-31.json", createdAt: "2026-07-31T10:00:00Z", sizeBytes: 210000, kind: BACKUP_KIND.AUTO, hasPayload: true },
  { id: "b4", fileName: "backup-2026-07-24.json", createdAt: "2026-07-24T10:00:00Z", sizeBytes: 195000, kind: BACKUP_KIND.AUTO, hasPayload: true },
  { id: "b5", fileName: "backup-2026-07-17.json", createdAt: "2026-07-17T10:00:00Z", sizeBytes: 180000, kind: BACKUP_KIND.AUTO, hasPayload: false },
  { id: "b6", fileName: "backup-2026-07-10.json", createdAt: "2026-07-10T10:00:00Z", sizeBytes: 175000, kind: BACKUP_KIND.AUTO, hasPayload: false },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-SA");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA");
}

export default function BackupPage() {
  const toast = useToast();
  const [backups, setBackups] = useState(MOCK_BACKUPS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [inspected, setInspected] = useState<typeof MOCK_BACKUPS[0] | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const lastBackup = backups[0];
  const usageRatio = 0.65;
  const storage = { usage: 6500000, quota: 10000000, persisted: true };

  const totalPages = Math.max(1, Math.ceil(backups.length / pageSize));
  const pageRows = backups.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateBackup = async () => {
    const newBackup = {
      id: `b${Date.now()}`,
      fileName: `backup-${new Date().toISOString().slice(0, 10)}.json`,
      createdAt: new Date().toISOString(),
      sizeBytes: Math.floor(Math.random() * 50000) + 200000,
      kind: BACKUP_KIND.MANUAL,
      hasPayload: true,
    };
    setBackups([newBackup, ...backups]);
    toast.toastOk(`تم إنشاء النسخة: ${newBackup.fileName} (${formatBytes(newBackup.sizeBytes)})`);
  };

  const handleRestore = () => {
    setRestoring(true);
    setTimeout(() => {
      setRestoring(false);
      setShowRestoreConfirm(false);
      toast.toastOk("تمت الاستعادة بنجاح: 12 سجلاً.");
    }, 1500);
  };

  const handleClearAll = () => {
    setShowClearConfirm(false);
    toast.toastOk("تم مسح جميع البيانات");
  };

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button onClick={handleCreateBackup} className="btn--navy btn--lg">
            <Download size={18} />
            <span>تنزيل ملف JSON</span>
          </Button>
        </div>
      </div>

      <KpiGrid>
        <Kpi
          variant="stacked"
          label="آخر نسخة"
          value={lastBackup ? formatDate(lastBackup.createdAt) : "لا توجد"}
          iconName="calendar"
          tone={lastBackup ? "blue" : "amber"}
          subtext={lastBackup ? formatDateTime(lastBackup.createdAt) : "أنشئ نسختك الأولى"}
        />
        <Kpi
          variant="stacked"
          label="التخزين المحلي"
          value={formatBytes(storage.usage)}
          iconName="database"
          tone="teal"
          subtext={`${Math.round((storage.usage / storage.quota) * 100)}% مستخدم من ${formatBytes(storage.quota)}`}
        />
        <Kpi
          variant="stacked"
          label="إصدار البيانات"
          value="v1.0.0"
          iconName="layers"
          tone="violet"
          subtext="مخطط قاعدة البيانات 1"
        />
        <Kpi
          variant="stacked"
          label="تذكير النسخ"
          value="أسبوعي"
          iconName="bell"
          tone="green"
          subtext="التذكير مفعّل"
        />
      </KpiGrid>

      {storage.quota && (
        <Card>
          <div className="card__body">
            <div className="stack" style={{ gap: "10px" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>استهلاك التخزين المحلي</span>
                <span className="field__hint">
                  {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                </span>
              </div>
              <ProgressBar value={usageRatio} />
              {storage.persisted ? (
                <AlertBox tone="ok">التخزين الدائم مفعّل — لن يحذف المتصفح بياناتك تلقائياً عند ضغط المساحة.</AlertBox>
              ) : (
                <AlertBox tone="warn">التخزين الدائم غير مفعّل. قد يحذف المتصفح البيانات عند امتلاء مساحة الجهاز. فعّله من «الإعدادات».</AlertBox>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="backup-grid">
        <Card title="استعادة نسخة" titleIcon={<Download size={20} />}>
          <div className="stack" style={{ gap: "16px" }}>
            <AlertBox tone="warn">لن تُستبدل البيانات قبل نجاح التحقق من الملف بالكامل.</AlertBox>
            <CheckboxField
              label="أنشئ نسخة تلقائية من البيانات الحالية قبل الاستعادة"
              name="autoBackup"
              checked={autoBackup}
              onChange={setAutoBackup}
            />
            <Button
              className="btn--danger btn--block"
              onClick={() => setShowRestoreConfirm(true)}
              disabled={!inspected}
            >
              <Upload size={18} />
              <span>استعادة البيانات</span>
            </Button>
            {inspected && (
              <AlertBox tone="ok">
                الملف صالح. يحتوي على {MOCK_BACKUPS.length} سجلاً وسيستبدل كل البيانات الحالية.
              </AlertBox>
            )}
          </div>
        </Card>

        <Card title="إنشاء نسخة احتياطية" titleIcon={<CloudUpload size={20} />}>
          <div className="stack" style={{ gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>تصدير كامل</h3>
              <p className="field__hint">يشمل المنتجات والعملاء والمبيعات والمصروفات وحركات المخزون والإعدادات.</p>
            </div>
            <Button onClick={handleCreateBackup} className="btn--navy btn--lg btn--block">
              <Download size={18} />
              <span>تنزيل ملف JSON</span>
            </Button>
            <AlertBox tone="info">يُحفظ الملف على جهازك فقط ولا يُرسل إلى أي خادم. انسخه إلى وسيط خارجي أو تخزين سحابي بنفسك.</AlertBox>
          </div>
        </Card>
      </div>

      <Card title="إجراءات التعافي" titleIcon={<Shield size={20} />}>
        <div className="stack" style={{ gap: "12px" }}>
          <AlertBox tone="info">في حال حدوث مشكلة بعد الاستعادة، يمكنك استخدام أحدث نسخة احتياطية من السجل أدناه لاسترجاع بياناتك.</AlertBox>
          <Button variant="ghost" className="btn--block" disabled={!lastBackup}>
            <Download size={18} />
            <span>تنزيل أحدث نسخة محفوظة</span>
          </Button>
          <Button variant="outline" className="btn--block">
            <Shield size={18} />
            <span>طلب تخزين دائم للمتصفح</span>
          </Button>
          <Button variant="outline-danger" className="btn--block" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={18} />
            <span>مسح جميع البيانات المحلية</span>
          </Button>
        </div>
      </Card>

      <Card title="سجل النسخ" titleIcon={<History size={20} />} flush>
        <DataTable
          caption="سجل النسخ الاحتياطية"
          columns={[
            {
              key: "fileName",
              label: "اسم الملف",
              render: (row) => (
                <span className="row" style={{ gap: "8px", flexWrap: "nowrap" }}>
                  <FileText size={16} />
                  {row.fileName}
                </span>
              ),
            },
            { key: "createdAt", label: "التاريخ", render: (row) => formatDateTime(row.createdAt) },
            { key: "sizeBytes", label: "الحجم", render: (row) => formatBytes(row.sizeBytes) },
            {
              key: "kind",
              label: "النوع",
              render: (row) => <Badge tone={row.kind === BACKUP_KIND.AUTO ? "blue" : "gray"}>{row.kind === BACKUP_KIND.AUTO ? "تلقائية" : "يدوية"}</Badge>,
            },
            {
              key: "status",
              label: "الحالة",
              render: (row) => (
                <Badge tone={row.hasPayload ? "green" : "gray"}>
                  {row.hasPayload ? "محفوظة" : "سجل فقط"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "الإجراءات",
              className: "is-actions",
              render: (row) => (
                <div className="table__actions">
                  <Button variant="ghost" size="sm" disabled={!row.hasPayload}>
                    <Download size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toast.toastOk("تم حذف النسخة من السجل")}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          empty={{
            iconName: "cloud-upload",
            title: "لا نسخ محفوظة",
            text: "أنشئ نسختك الأولى — يُحتفظ بآخر 5 نسخ داخل المتصفح.",
          }}
        />
        {backups.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={backups.length}
            unit="نسخة"
            sizes={[5, 10]}
            onPage={setPage}
          />
        )}
      </Card>

      <ConfirmDialog
        open={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="تأكيد الاستعادة"
        message="سيتم استبدال جميع البيانات الحالية ببيانات الملف. هذا الإجراء لا يمكن التراجع عنه إلا باستعادة نسخة أخرى."
        confirmLabel="استبدال البيانات"
        tone="danger"
        extra={<AlertBox tone="info">سيتم إنشاء نسخة تلقائية من بياناتك الحالية قبل الاستبدال.</AlertBox>}
      />

      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="مسح جميع البيانات"
        message="سيتم حذف كل المنتجات والعملاء والفواتير والمصروفات وحركات المخزون نهائياً من هذا المتصفح."
        confirmLabel="نعم، امسح كل شيء"
        tone="danger"
        extra={<AlertBox tone="info">سيبقى سجل النسخ الاحتياطية المحفوظة محلياً كي تتمكّن من الاستعادة.</AlertBox>}
      />

    </div>
  );
}
