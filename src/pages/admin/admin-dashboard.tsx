import { useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  SectionHeader,
  SummaryCard,
  DashboardTable,
} from "@/components/admin/dashboard";

const SECTIONS = [
  "AIRPORT PARKING & TRIPS",
  "COMMISSIONS",
  "OPERATIONS — PICK UP AND DROP OFF",
  "TURO MESSAGES INSPECTIONS",
  "CAR ISSUES / INSPECTIONS",
  "MAINTENANCE",
  "TASK MANAGEMENT",
  "NOTICE BOARD",
] as const;

const demoColumns = [
  { key: "month", label: "Month", align: "left" as const },
  { key: "grossCarFees", label: "Gross Car Fees", align: "right" as const },
  { key: "refunds", label: "Refunds", align: "right" as const },
  { key: "expenses", label: "Expenses", align: "right" as const },
  { key: "carOwnerSplit", label: "Car Owner Split", align: "right" as const },
  { key: "net", label: "Net", align: "right" as const },
];

const demoRows = [
  { month: "January", grossCarFees: "$0.00", refunds: "$0.00", expenses: "$0.00", carOwnerSplit: "$0.00", net: "$0.00" },
  { month: "February", grossCarFees: "$0.00", refunds: "$0.00", expenses: "$0.00", carOwnerSplit: "$0.00", net: "$0.00" },
  { month: "March", grossCarFees: "$0.00", refunds: "$0.00", expenses: "$0.00", carOwnerSplit: "$0.00", net: "$0.00" },
];

const demoTotals = {
  month: "TOTAL",
  grossCarFees: "$0.00",
  refunds: "$0.00",
  expenses: "$0.00",
  carOwnerSplit: "$0.00",
  net: "$0.00",
};

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <SectionHeader title={title} />
      <div className="mt-2 rounded-md bg-[#111111] px-6 py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#FFD700]">
          Phase 2 — Coming Soon
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  useEffect(() => {
    document.title = "Admin Dashboard | GLA";
  }, []);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-black">
        {/* Brand Header */}
        <div className="mb-8 px-4 py-6 text-center">
          <div className="mx-auto mb-2 h-[1px] w-48 bg-[#FFD700]" />
          <h1 className="text-2xl font-bold uppercase tracking-widest text-[#FFD700]">
            Golden Luxury Auto
          </h1>
          <div className="mx-auto mt-2 h-[1px] w-48 bg-[#FFD700]" />
          <p className="mt-3 text-sm uppercase tracking-wide text-white/70">
            Admin Dashboard
          </p>
        </div>

        {/* Section 1: Income and Expenses (working demo) */}
        <div className="mb-8">
          <SectionHeader title="INCOME AND EXPENSES" />

          <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:grid-cols-3">
            <SummaryCard label="Total Revenue" value="$0.00" variant="gold" />
            <SummaryCard label="Total Expenses" value="$0.00" variant="dark" />
            <SummaryCard label="Net Income" value="$0.00" variant="gold" />
          </div>

          <div className="mt-4 px-4">
            <DashboardTable
              columns={demoColumns}
              rows={demoRows}
              totalsRow={demoTotals}
            />
          </div>
        </div>

        {/* Remaining sections — placeholders */}
        {SECTIONS.map((section) => (
          <PlaceholderSection key={section} title={section} />
        ))}
      </div>
    </AdminLayout>
  );
}
