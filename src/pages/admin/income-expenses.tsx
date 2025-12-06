import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";

interface ExpenseRow {
  label: string;
  values: number[];
}

interface ExpenseCategory {
  label: string;
  isExpanded: boolean;
  rows: ExpenseRow[];
  total?: boolean;
}

const months = [
  "Jan 2025",
  "Feb 2025",
  "Mar 2025",
  "Apr 2025",
  "May 2025",
  "Jun 2025",
  "Jul 2025",
  "Aug 2025",
  "Sep 2025",
  "Oct 2025",
  "Nov 2025",
  "Dec 2025",
];

const additionalColumns = [
  "Yr End Recon",
  "Yr End Recon Split",
  "Total",
];

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function IncomeExpensesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([
    {
      label: "CAR MANAGEMENT AND OWNER SPLIT",
      isExpanded: false,
      rows: [
        { label: "Owner Split", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Management Fee", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    },
    {
      label: "INCOME AND EXPENSES",
      isExpanded: false,
      rows: [
        { label: "Gross Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Net Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    },
    {
      label: "OPERATING EXPENSES (DIRECT DELIVERY)",
      isExpanded: true,
      rows: [
        { label: "Labor - Car Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Driver", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parking - Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 1277, 45, 25, 0] },
        { label: "Taxi/Uber/Lyft/Lime", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39.96, 0] },
      ],
      total: true,
    },
    {
      label: "OPERATING EXPENSES (COGS)",
      isExpanded: false,
      rows: [
        { label: "Fuel", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Maintenance", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Repairs", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "GLA PARKING FEE & LABOR CLEANING",
      isExpanded: false,
      rows: [
        { label: "Parking Fee", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "REIMBURSED AND NON-REIMBURSED BILLS",
      isExpanded: false,
      rows: [
        { label: "Reimbursed Bills", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Non-Reimbursed Bills", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "OPERATING EXPENSES (OFFICE SUPPORT)",
      isExpanded: false,
      rows: [
        { label: "Office Rent", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Office Supplies", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Utilities", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Software & Subscriptions", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "INCOME & EXPENSES SUMMARY",
      isExpanded: false,
      rows: [
        { label: "Total Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Net Profit/Loss", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "EBITDA",
      isExpanded: false,
      rows: [
        { label: "Earnings Before Interest, Taxes, Depreciation, Amortization", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "HISTORY",
      isExpanded: false,
      rows: [
        { label: "Previous Year Total", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Year-to-Date", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "CAR RENTAL VALUE PER MONTH",
      isExpanded: false,
      rows: [
        { label: "Average Rental Value", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Rental Days", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "PARKING AIRPORT AVERAGE PER TRIP - GLA",
      isExpanded: false,
      rows: [
        { label: "Average Parking Cost (GLA)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Trips", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "PARKING AIRPORT AVERAGE PER TRIP - QB",
      isExpanded: false,
      rows: [
        { label: "Average Parking Cost (QB)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Trips", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
  ]);

  const toggleCategory = (index: number) => {
    setCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, isExpanded: !cat.isExpanded } : cat))
    );
  };

  const calculateTotal = (rows: ExpenseRow[]): number[] => {
    return months.map((_, monthIndex) =>
      rows.reduce((sum, row) => sum + row.values[monthIndex], 0)
    );
  };

  const calculateYearEndRecon = (values: number[]): number => {
    return values.reduce((sum, val) => sum + val, 0);
  };

  const calculateYearEndReconSplit = (values: number[]): number => {
    // This would typically be a percentage or split calculation
    // For now, returning a placeholder calculation
    return calculateYearEndRecon(values) * 0.5;
  };

  const calculateGrandTotal = (values: number[]): number => {
    return calculateYearEndRecon(values);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-2">Income and Expenses</h1>
          <p className="text-gray-400 text-sm">Financial tracking and expense management</p>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-[#1a1a1a] z-20 min-w-[300px] border-r border-[#2a2a2a]">
                    Category / Expense
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-4 py-3 text-sm font-medium text-gray-300 border-l border-[#2a2a2a] min-w-[120px] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  {additionalColumns.map((col) => (
                    <th
                      key={col}
                      className="text-right px-4 py-3 text-sm font-medium text-gray-300 border-l border-[#2a2a2a] min-w-[140px] whitespace-nowrap bg-[#1f1f1f]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((category, categoryIndex) => {
                  const categoryTotal = category.total ? calculateTotal(category.rows) : null;

                  return (
                    <React.Fragment key={categoryIndex}>
                      {/* Category Header */}
                      <tr
                        className="bg-[#151515] border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                        onClick={() => toggleCategory(categoryIndex)}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-[#EAEB80] sticky left-0 bg-[#151515] z-20 border-r border-[#2a2a2a]">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-center">{category.isExpanded ? "–" : "+"}</span>
                            <span>{category.label}</span>
                          </div>
                        </td>
                        {months.map((_, monthIndex) => (
                          <td
                            key={monthIndex}
                            className="text-right px-4 py-2 text-sm text-gray-400 border-l border-[#2a2a2a]"
                          >
                            {categoryTotal
                              ? formatCurrency(categoryTotal[monthIndex])
                              : "—"}
                          </td>
                        ))}
                        {categoryTotal && (
                          <>
                            <td className="text-right px-4 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateYearEndRecon(categoryTotal))}
                            </td>
                            <td className="text-right px-4 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateYearEndReconSplit(categoryTotal))}
                            </td>
                            <td className="text-right px-4 py-2 text-sm font-semibold text-[#EAEB80] border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateGrandTotal(categoryTotal))}
                            </td>
                          </>
                        )}
                        {!categoryTotal && (
                          <>
                            <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              —
                            </td>
                            <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              —
                            </td>
                            <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              —
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Category Rows */}
                      {category.isExpanded &&
                        category.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors"
                          >
                            <td className="px-4 py-2 pl-12 text-sm text-gray-300 sticky left-0 bg-[#0f0f0f] z-20 border-r border-[#2a2a2a]">
                              {row.label}
                            </td>
                            {row.values.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className={cn(
                                  "text-right px-4 py-2 text-sm border-l border-[#2a2a2a]",
                                  value !== 0
                                    ? "text-[#EAEB80] font-medium bg-[#EAEB80]/5"
                                    : "text-gray-500"
                                )}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="text-right px-4 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateYearEndRecon(row.values) !== 0
                                  ? "text-[#EAEB80] font-medium"
                                  : "text-gray-500"
                              )}>
                                {formatCurrency(calculateYearEndRecon(row.values))}
                              </span>
                            </td>
                            <td className="text-right px-4 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateYearEndReconSplit(row.values) !== 0
                                  ? "text-[#EAEB80] font-medium"
                                  : "text-gray-500"
                              )}>
                                {formatCurrency(calculateYearEndReconSplit(row.values))}
                              </span>
                            </td>
                            <td className="text-right px-4 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateGrandTotal(row.values) !== 0
                                  ? "text-[#EAEB80]"
                                  : "text-gray-400"
                              )}>
                                {formatCurrency(calculateGrandTotal(row.values))}
                              </span>
                            </td>
                          </tr>
                        ))}

                      {/* Category Total Row */}
                      {category.isExpanded && category.total && (
                        <tr className="bg-[#1a1a1a] border-b-2 border-[#2a2a2a] font-semibold">
                          <td className="px-4 py-2 pl-12 text-sm text-[#EAEB80] sticky left-0 bg-[#1a1a1a] z-20 border-r border-[#2a2a2a]">
                            {category.label} (Total)
                          </td>
                          {categoryTotal?.map((total, monthIndex) => (
                            <td
                              key={monthIndex}
                              className={cn(
                                "text-right px-4 py-2 text-sm border-l border-[#2a2a2a]",
                                total !== 0
                                  ? "text-[#EAEB80] font-semibold bg-[#EAEB80]/10"
                                  : "text-gray-400"
                              )}
                            >
                              {formatCurrency(total)}
                            </td>
                          ))}
                          {categoryTotal && (
                            <>
                              <td className="text-right px-4 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                <span className={cn(
                                  calculateYearEndRecon(categoryTotal) !== 0
                                    ? "text-[#EAEB80]"
                                    : "text-gray-400"
                                )}>
                                  {formatCurrency(calculateYearEndRecon(categoryTotal))}
                                </span>
                              </td>
                              <td className="text-right px-4 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                <span className={cn(
                                  calculateYearEndReconSplit(categoryTotal) !== 0
                                    ? "text-[#EAEB80]"
                                    : "text-gray-400"
                                )}>
                                  {formatCurrency(calculateYearEndReconSplit(categoryTotal))}
                                </span>
                              </td>
                              <td className="text-right px-4 py-2 text-sm font-bold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                <span className={cn(
                                  calculateGrandTotal(categoryTotal) !== 0
                                    ? "text-[#EAEB80]"
                                    : "text-gray-400"
                                )}>
                                  {formatCurrency(calculateGrandTotal(categoryTotal))}
                                </span>
                              </td>
                            </>
                          )}
                          {!categoryTotal && (
                            <>
                              <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                —
                              </td>
                              <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                —
                              </td>
                              <td className="text-right px-4 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                —
                              </td>
                            </>
                          )}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

