"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, User, Receipt, Banknote, TrendingUp, TrendingDown } from "lucide-react";
import { Card, Badge, EmptyState, DetailRow, Button, Avatar } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import {
  MOCK_CUSTOMERS,
  MOCK_LEDGERS,
  MOCK_SETTINGS,
  MOCK_STATEMENT_ENTRIES,
  formatAmount,
  formatDateTime,
  formatInt,
  initials,
} from "@/lib/mock";

export default function CustomerStatementPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [balanceMinor, setBalanceMinor] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const found = MOCK_CUSTOMERS.find((c) => c.id === params.id);
      if (found) {
        setCustomer(found);
        const stmtEntries = MOCK_STATEMENT_ENTRIES[params.id] || [];
        setEntries(stmtEntries);
        setBalanceMinor(stmtEntries.length > 0 ? stmtEntries[stmtEntries.length - 1].balanceMinor : 0);
      }
      setLoading(false);
    }, 300);
  }, [params.id]);

  if (loading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <Card
        body={
          <EmptyState
            iconName="search"
            title="العميل غير موجود"
            action={
              <Link href="/customers" className="btn btn--primary">
                <ChevronLeft size={16} />
                <span>العودة إلى العملاء</span>
              </Link>
            }
          />
        }
      />
    );
  }

  const s = MOCK_SETTINGS;
  const symbol = s.currencySymbol;

  return (
    <div className="stack">
      <nav className="breadcrumb">
        <Link href="/customers" style={{ color: "var(--text-2)" }}>العملاء</Link>
        <ChevronLeft size={14} />
        <span>{customer.name}</span>
      </nav>

      <div className="page__head">
        <div className="row" style={{ gap: 12 }}>
          <Avatar initials={initials(customer.name)} />
          <div>
            <h2 className="page__title">{customer.name}</h2>
            {customer.phone && <p className="field__hint">{customer.phone}</p>}
          </div>
        </div>
        <div className="page__actions">
          <span
            className="badge"
            style={{
              background: balanceMinor > 0 ? "var(--red-soft)" : "var(--green-soft)",
              color: balanceMinor > 0 ? "var(--red)" : "var(--green)",
              fontSize: "15px",
              padding: "8px 16px",
            }}
          >
            الرصيد: {formatAmount(balanceMinor)} {symbol}
          </span>
        </div>
      </div>

      <Card
        title="كشف الحساب"
        titleIcon={<Receipt size={18} />}
        flush
        body={
          <DataTable
            caption={`كشف حساب ${customer.name}`}
            columns={[
              { key: "at", label: "التاريخ", render: (entry) => formatDateTime(entry.at) },
              {
                key: "kind",
                label: "النوع",
                render: (entry) => (
                  <Badge tone={entry.kind === "invoice" ? "blue" : "green"}>
                    {entry.kind === "invoice" ? "فاتورة" : "دفعة"}
                  </Badge>
                ),
              },
              {
                key: "label",
                label: "المرجع",
                render: (entry) =>
                  entry.kind === "invoice" ? (
                    <Link href={`/invoices/${entry.ref}`} style={{ color: "var(--blue)" }}>
                      {entry.label}
                    </Link>
                  ) : (
                    <span>{entry.label}</span>
                  ),
              },
              {
                key: "debit",
                label: "مدين (عليه)",
                render: (entry) =>
                  entry.debitMinor > 0 ? (
                    <span style={{ color: "var(--red)" }}>
                      {formatAmount(entry.debitMinor)} {symbol}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "credit",
                label: "دائن (له)",
                render: (entry) =>
                  entry.creditMinor > 0 ? (
                    <span style={{ color: "var(--green)" }}>
                      {formatAmount(entry.creditMinor)} {symbol}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "balance",
                label: "الرصيد التراكمي",
                render: (entry) => (
                  <span style={{ fontWeight: 600 }}>
                    {formatAmount(entry.balanceMinor)} {symbol}
                  </span>
                ),
              },
            ]}
            rows={entries}
            empty={{
              iconName: "history",
              title: "لا حركات على الحساب",
              text: "لم تُسجَّل فواتير آجلة أو مدفوعات لهذا العميل.",
            }}
          />
        }
      />
    </div>
  );
}
