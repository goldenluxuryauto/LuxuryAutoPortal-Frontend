import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { SectionHeader } from "@/components/admin/dashboard/SectionHeader";
import { DashboardTable } from "@/components/admin/dashboard/DashboardTable";
import { formatCurrency } from "@/components/admin/dashboard/utils";
import React from "react";

// ── Types ────────────────────────────────────────────────────────────────

interface CommissionRow {
  commissions_aid: number;
  commissions_type: string;
  commissions_amount: string;
  commissions_is_paid: number;
  commissions_remarks: string;
  commissions_employee_id: number;
  commissions_date: string;
  commissions_account_owner_name: string;
  commissions_account_owner_id: string;
  commissions_percentage: string;
  commissions_percentage_amount: string;
  fullname?: string;
}

interface CommissionsApiResponse {
  success: boolean;
  data: CommissionRow[];
  total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getMonthRange(offset: number): {
  label: string;
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `${firstDay.toLocaleString("en-US", { month: "long" })} ${year}`;
  const dateFrom = `${year}-${pad(month + 1)}-${pad(firstDay.getDate())}`;
  const dateTo = `${year}-${pad(month + 1)}-${pad(lastDay.getDate())}`;

  return { label, dateFrom, dateTo };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function truncate(str: string, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

function StatusBadge({ paid }: { paid: number }) {
  return paid === 1 ? (
    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
      Paid
    </span>
  ) : (
    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      Unpaid
    </span>
  );
}

// ── Table columns ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "type", label: "Type", align: "left" as const },
  { key: "name", label: "Name", align: "left" as const },
  { key: "amount", label: "Amount", align: "right" as const },
  { key: "pct", label: "%", align: "right" as const },
  { key: "pctAmount", label: "% Amount", align: "right" as const },
  { key: "remarks", label: "Remarks", align: "left" as const },
  { key: "status", label: "Status", align: "left" as const },
  { key: "date", label: "Date", align: "left" as const },
];

function buildRows(data: CommissionRow[]): Record<string, React.ReactNode>[] {
  return data.map((row) => ({
    type: row.commissions_type || "—",
    name: row.fullname || row.commissions_account_owner_name || "—",
    amount: formatCurrency(parseFloat(row.commissions_amount) || 0),
    pct: row.commissions_percentage ? `${row.commissions_percentage}%` : "—",
    pctAmount: formatCurrency(parseFloat(row.commissions_percentage_amount) || 0),
    remarks: truncate(row.commissions_remarks, 30),
    status: <StatusBadge paid={row.commissions_is_paid} />,
    date: formatDate(row.commissions_date),
  }));
}

function buildTotals(data: CommissionRow[]): Record<string, React.ReactNode> {
  const totalAmount = data.reduce(
    (sum, r) => sum + (parseFloat(r.commissions_amount) || 0),
    0,
  );
  const totalPctAmount = data.reduce(
    (sum, r) => sum + (parseFloat(r.commissions_percentage_amount) || 0),
    0,
  );
  return {
    type: "TOTAL",
    name: "",
    amount: formatCurrency(totalAmount),
    pct: "",
    pctAmount: formatCurrency(totalPctAmount),
    remarks: "",
    status: "",
    date: "",
  };
}

// ── Loading skeleton ─────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-wrap gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex-1 min-w-[300px]">
          <div className="rounded-t-lg bg-black px-4 py-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-700" />
          </div>
          <div className="space-y-2 bg-[#111111] p-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 animate-pulse rounded bg-gray-700" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Month card ───────────────────────────────────────────────────────────

function MonthCard({
  monthLabel,
  data,
  isLoading,
}: {
  monthLabel: string;
  data: CommissionRow[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return null; // handled by parent skeleton

  const rows = data ?? [];
  const isEmpty = rows.length === 0;

  return (
    <div className="flex-1 min-w-[300px]">
      <div className="rounded-t-lg bg-black px-4 py-2">
        <p className="text-sm font-bold uppercase text-[#FFD700]">
          Commissions &mdash; {monthLabel}
        </p>
      </div>
      {isEmpty ? (
        <div className="rounded-b-lg bg-[#111111] px-6 py-8 text-center">
          <p className="text-sm text-white/60">
            No commissions found for this period
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <DashboardTable
            columns={COLUMNS}
            rows={buildRows(rows)}
            totalsRow={buildTotals(rows)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function CommissionsSection() {
  const current = getMonthRange(0);
  const prev = getMonthRange(-1);

  const currentQuery = useQuery<CommissionsApiResponse>({
    queryKey: ["/api/payroll/commissions", "current-month", current.dateFrom, current.dateTo],
    queryFn: async () => {
      const res = await fetch(
        buildApiUrl(
          `/api/payroll/commissions?dateFrom=${current.dateFrom}&dateTo=${current.dateTo}&limit=500`,
        ),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`Failed to fetch commissions: ${res.status}`);
      return res.json();
    },
  });

  const prevQuery = useQuery<CommissionsApiResponse>({
    queryKey: ["/api/payroll/commissions", "prev-month", prev.dateFrom, prev.dateTo],
    queryFn: async () => {
      const res = await fetch(
        buildApiUrl(
          `/api/payroll/commissions?dateFrom=${prev.dateFrom}&dateTo=${prev.dateTo}&limit=500`,
        ),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`Failed to fetch commissions: ${res.status}`);
      return res.json();
    },
  });

  const isLoading = currentQuery.isLoading || prevQuery.isLoading;

  return (
    <div className="mb-8">
      <SectionHeader title="COMMISSIONS" />
      <div className="mt-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex flex-wrap gap-4">
            <MonthCard
              monthLabel={prev.label}
              data={prevQuery.data?.data}
              isLoading={false}
            />
            <MonthCard
              monthLabel={current.label}
              data={currentQuery.data?.data}
              isLoading={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
