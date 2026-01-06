import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";

const additionalColumns = [
  "Yr End Recon",
  "Yr End Recon Split",
  "Total",
];

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const generateMonths = (year: string): string[] => {
  const yearNum = parseInt(year, 10);
  return [
    `Jan ${yearNum}`,
    `Feb ${yearNum}`,
    `Mar ${yearNum}`,
    `Apr ${yearNum}`,
    `May ${yearNum}`,
    `Jun ${yearNum}`,
    `Jul ${yearNum}`,
    `Aug ${yearNum}`,
    `Sep ${yearNum}`,
    `Oct ${yearNum}`,
    `Nov ${yearNum}`,
    `Dec ${yearNum}`,
  ];
};

export default function TotalExpensesPage() {
  const [, params] = useRoute("/admin/cars/:id/expenses");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  const months = generateMonths(selectedYear);

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/cars", carId],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const url = buildApiUrl(`/api/cars/${carId}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch car");
      return response.json();
    },
    enabled: !!carId,
    retry: false,
  });

  const car = data?.data;

  // Fetch onboarding data for additional car info
  const { data: onboardingData } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/onboarding/vin", car?.vin, "onboarding"],
    queryFn: async () => {
      if (!car?.vin) throw new Error("No VIN");
      const url = buildApiUrl(`/api/onboarding/vin/${encodeURIComponent(car.vin)}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, data: null };
        }
        throw new Error("Failed to fetch onboarding data");
      }
      return response.json();
    },
    enabled: !!car?.vin,
    retry: false,
  });

  const onboarding = onboardingData?.data;

  const calculateYearEndRecon = (values: number[]): number => {
    return values.reduce((sum, val) => sum + val, 0);
  };

  const calculateYearEndReconSplit = (values: number[]): number => {
    return calculateYearEndRecon(values) * 0.5;
  };

  const calculateGrandTotal = (values: number[]): number => {
    return calculateYearEndRecon(values);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <CarDetailSkeleton />
      </AdminLayout>
    );
  }

  if (error || !car) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-400">Failed to load car details</p>
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="mt-4 text-[#EAEB80] hover:underline"
          >
            ← Back to View Car
          </button>
        </div>
      </AdminLayout>
    );
  }

  const carName = car.makeModel || `${car.year || ""} ${car.vin}`.trim();
  const ownerName = car.owner
    ? `${car.owner.firstName} ${car.owner.lastName}`
    : "N/A";
  const ownerContact = car.owner?.phone || "N/A";
  const ownerEmail = car.owner?.email || "N/A";
  const fuelType = onboarding?.fuelType || car.fuelType || "N/A";
  const tireSize = onboarding?.tireSize || car.tireSize || "N/A";
  const oilType = onboarding?.oilType || car.oilType || "N/A";

  // Expense rows data
  const expenseRows = [
    { label: "Direct Delivery", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "COGS", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Office Support", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];

  // Calculate total expenses
  const totalExpenses = months.map((_, monthIndex) =>
    expenseRows.reduce((sum, row) => sum + row.values[monthIndex], 0)
  );

  return (
    <AdminLayout>
      <div className="flex flex-col w-full overflow-x-hidden">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setLocation("/admin/cars")}
            className="text-gray-400 hover:text-[#EAEB80] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cars</span>
          </button>
          <span className="text-gray-500">/</span>
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="text-gray-400 hover:text-[#EAEB80] transition-colors"
          >
            View Car
          </button>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300">Total Expenses</span>
        </div>

        {/* Header Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Car Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Car Name:</span>
                  <p className="text-sm text-gray-300">{carName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">VIN #:</span>
                  <p className="text-sm text-gray-300">{car.vin || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">License:</span>
                  <p className="text-sm text-gray-300">{car.licensePlate || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Owner Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Name:</span>
                  <p className="text-sm text-gray-300">{ownerName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Contact #:</span>
                  <p className="text-sm text-gray-300">{ownerContact}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Email:</span>
                  <p className="text-sm text-gray-300">{ownerEmail}</p>
                </div>
              </div>
            </div>

            {/* Car Specifications */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Specifications</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Fuel/Gas:</span>
                  <p className="text-sm text-gray-300">{fuelType}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Tire Size:</span>
                  <p className="text-sm text-gray-300">{tireSize}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Oil Type:</span>
                  <p className="text-sm text-gray-300">{oilType}</p>
                </div>
              </div>
            </div>

            {/* Turo Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Turo Links</h3>
              <div className="space-y-2">
                {car.turoLink && (
                  <div>
                    <a
                      href={car.turoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#EAEB80] hover:underline text-sm flex items-center gap-1"
                    >
                      Turo Link: View Car
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {car.adminTuroLink && (
                  <div>
                    <a
                      href={car.adminTuroLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#EAEB80] hover:underline text-sm flex items-center gap-1"
                    >
                      Admin Turo Link: View Car
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {!car.turoLink && !car.adminTuroLink && (
                  <span className="text-gray-500 text-sm">No Turo links available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Total Expenses Header with Year Filter */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic">Total Expenses</h1>
          <div className="w-[150px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Total Expenses Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="w-full overflow-x-auto">
            <table className="border-collapse w-full table-fixed" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5%' }} />)}
                {additionalColumns.map((_, idx) => <col key={idx} style={{ width: '6%' }} />)}
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Expenses
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  {additionalColumns.map((col) => (
                    <th
                      key={col}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1f1f1f] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors"
                  >
                    <td className="px-3 py-2 text-sm text-gray-300 sticky left-0 bg-[#0f0f0f] z-[50] border-r border-[#2a2a2a]">
                      <span className="whitespace-nowrap">{row.label}</span>
                    </td>
                    {row.values.map((value, monthIndex) => (
                      <td
                        key={monthIndex}
                        className={cn(
                          "text-right px-2 py-2 text-sm border-l border-[#2a2a2a]",
                          value !== 0
                            ? "text-gray-300 font-medium"
                            : "text-gray-500"
                        )}
                      >
                        {formatCurrency(value)}
                      </td>
                    ))}
                    <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                      <span className={cn(
                        calculateYearEndRecon(row.values) !== 0
                          ? "text-gray-300 font-medium"
                          : "text-gray-500"
                      )}>
                        {formatCurrency(calculateYearEndRecon(row.values))}
                      </span>
                    </td>
                    <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                      <span className={cn(
                        calculateYearEndReconSplit(row.values) !== 0
                          ? "text-gray-300 font-medium"
                          : "text-gray-500"
                      )}>
                        {formatCurrency(calculateYearEndReconSplit(row.values))}
                      </span>
                    </td>
                    <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                      <span className={cn(
                        calculateGrandTotal(row.values) !== 0
                          ? "text-gray-300"
                          : "text-gray-400"
                      )}>
                        {formatCurrency(calculateGrandTotal(row.values))}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Total Expenses Row */}
                <tr className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors bg-[#151515]">
                  <td className="px-3 py-2 text-sm font-semibold text-[#EAEB80] sticky left-0 bg-[#151515] z-[50] border-r border-[#2a2a2a]">
                    <span className="whitespace-nowrap">Total Expenses</span>
                  </td>
                  {totalExpenses.map((value, monthIndex) => (
                    <td
                      key={monthIndex}
                      className={cn(
                        "text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a]",
                        value !== 0
                          ? "text-[#EAEB80]"
                          : "text-gray-400"
                      )}
                    >
                      {formatCurrency(value)}
                    </td>
                  ))}
                  <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                    <span className={cn(
                      calculateYearEndRecon(totalExpenses) !== 0
                        ? "text-[#EAEB80]"
                        : "text-gray-400"
                    )}>
                      {formatCurrency(calculateYearEndRecon(totalExpenses))}
                    </span>
                  </td>
                  <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                    <span className={cn(
                      calculateYearEndReconSplit(totalExpenses) !== 0
                        ? "text-[#EAEB80]"
                        : "text-gray-400"
                    )}>
                      {formatCurrency(calculateYearEndReconSplit(totalExpenses))}
                    </span>
                  </td>
                  <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                    <span className={cn(
                      calculateGrandTotal(totalExpenses) !== 0
                        ? "text-[#EAEB80]"
                        : "text-gray-400"
                    )}>
                      {formatCurrency(calculateGrandTotal(totalExpenses))}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

