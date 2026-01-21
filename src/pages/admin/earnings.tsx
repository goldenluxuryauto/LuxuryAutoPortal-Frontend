                                                                                                                                                                                import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { GraphsChartsReportSection } from "@/pages/admin/components/GraphsChartsReportSection";

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

interface TableItem {
  type: "standalone" | "category";
  label: string; 
  values?: number[]; // For standalone rows
  category?: ExpenseCategory; // For expandable categories
}

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

export default function EarningsPage() {
  const [, params] = useRoute("/admin/cars/:id/earnings");
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
          return { success: false, data: null };
        }
        throw new Error("Failed to fetch onboarding");
      }
      return response.json();
    },
    enabled: !!car?.vin,
    retry: false,
  });

  const onboarding = onboardingData?.success ? onboardingData?.data : null;

  // Define categories separately
  const [categories, setCategories] = useState<ExpenseCategory[]>([
    {
      label: "INCOME AND EXPENSES",
      isExpanded: true,
      rows: [
        { label: "Delivery Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Electric Prepaid Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Smoking Fines", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas Prepaid Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Miles Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Ski Racks Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Child Seat Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Coolers Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Income Insurance and Client Wrecks", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Other Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    },
    {
      label: "OPERATING EXPENSES (DIRECT DELIVERY)",
      isExpanded: true,
      rows: [
        { label: "Labor - Car Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Driver", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parking - Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Taxi/Uber/Lyft/Lime", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "OPERATING EXPENSES (COGS - PER VEHICLE)",
      isExpanded: true,
      rows: [
        { label: "Auto Body Shop / Wreck", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Alignment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Battery", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Brakes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Payment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Insurance", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Seats", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Cleaning Supplies / Tools", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Emissions", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "GPS System", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Keys & Fob", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Detailing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Windshield", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Wipers", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Uber/Lyft/Lime", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Towing / Impound Fees", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tired Air Station", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tires", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Oil/Lube", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parts", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Ski Racks", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tickets & Tolls", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Mechanic", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "License & Registration", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "GLA PARKING FEE & LABOR CLEANING",
      isExpanded: true,
      rows: [
        { label: "GLA Labor - Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "GLA Parking Fee", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "REIMBURSED AND NON-REIMBURSED BILLS",
      isExpanded: true,
      rows: [
        { label: "Electric - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Electric Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Service Run", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parking Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Uber/Lyft/Lime - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
  ]);

  const toggleCategory = (categoryLabel: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.label === categoryLabel ? { ...cat, isExpanded: !cat.isExpanded } : cat))
    );
  };

  const calculateTotal = (rows: ExpenseRow[]): number[] => {
    return months.map((_, monthIndex) =>
      rows.reduce((sum, row) => sum + row.values[monthIndex], 0)
    );
  };

  // Define table items in the correct order (standalone rows and categories)
  // This is computed from categories state to ensure it updates when categories change
  const reimbursedBillsCategory = categories.find(c => c.label === "REIMBURSED AND NON-REIMBURSED BILLS")!;
  const totalReimbursedBills = calculateTotal(reimbursedBillsCategory.rows);
  
  const tableItems: TableItem[] = [
    { type: 'standalone', label: "Car Management Split", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'standalone', label: "Negative Balance Carry Over", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'category', label: "INCOME AND EXPENSES", category: categories.find(c => c.label === "INCOME AND EXPENSES")! },
    { type: 'category', label: "OPERATING EXPENSES (DIRECT DELIVERY)", category: categories.find(c => c.label === "OPERATING EXPENSES (DIRECT DELIVERY)")! },
    { type: 'category', label: "OPERATING EXPENSES (COGS - PER VEHICLE)", category: categories.find(c => c.label === "OPERATING EXPENSES (COGS - PER VEHICLE)")! },
    { type: 'standalone', label: "Total Expenses (COGS)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'standalone', label: "Rental Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'standalone', label: "Car Owner Split", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'category', label: "GLA PARKING FEE & LABOR CLEANING", category: categories.find(c => c.label === "GLA PARKING FEE & LABOR CLEANING")! },
    { type: 'category', label: "REIMBURSED AND NON-REIMBURSED BILLS", category: reimbursedBillsCategory },
    { type: 'standalone', label: "TOTAL REIMBURSED AND NON-REIMBURSED BILLS", values: totalReimbursedBills },
  ];

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

  return (
    <AdminLayout>
      <div className="flex flex-col w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to View Car</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Earnings</h1>
            {car && (
              <p className="text-sm text-gray-400 mt-1">
                Car: {car.makeModel || "Unknown Car"}
              </p>
            )}
          </div>
        </div>

        {/* Car and Owner Information Header */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Car Information */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Car Information</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Car Name: </span>
                  <span className="text-white text-xs sm:text-sm break-words">{carName}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">VIN #: </span>
                  <span className="text-white font-mono text-xs sm:text-sm break-all">{car.vin}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">License: </span>
                  <span className="text-white text-xs sm:text-sm">{car.licensePlate || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Owner Information</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Name: </span>
                  <span className="text-white text-xs sm:text-sm break-words">{ownerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Contact #: </span>
                  <span className="text-white text-xs sm:text-sm">{ownerContact}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Email: </span>
                  <span className="text-white text-xs sm:text-sm break-all">{ownerEmail}</span>
                </div>
              </div>
            </div>

            {/* Car Specifications */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Car Specifications</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Fuel/Gas: </span>
                  <span className="text-white text-xs sm:text-sm">{fuelType}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Tire Size: </span>
                  <span className="text-white text-xs sm:text-sm">{tireSize}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Oil Type: </span>
                  <span className="text-white text-xs sm:text-sm">{oilType}</span>
                </div>
              </div>
            </div>

            {/* Turo Links */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Turo Links</h3>
              <div className="space-y-1.5 sm:space-y-2">
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

        {/* Earnings Header with Year Filter */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic">Earnings</h1>
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

        {/* Earnings Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="w-full h-[600px] overflow-y-auto overflow-x-auto">
            <table className="border-collapse w-full table-fixed" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '4.5%' }} />)}
                {additionalColumns.map((_, idx) => <col key={idx} style={{ width: '5.5%' }} />)}
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Category / Expense
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
              <tbody className="relative">
                {tableItems.map((item, itemIndex) => {
                  if (item.type === 'standalone') {
                    // Render standalone row
                    const values = item.values || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    return (
                      <tr
                        key={itemIndex}
                        className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors"
                      >
                        <td className="px-3 py-2 text-sm text-gray-300 sticky left-0 bg-[#0f0f0f] z-[50] border-r border-[#2a2a2a]">
                          <span className="whitespace-nowrap">{item.label}</span>
                        </td>
                        {values.map((value, monthIndex) => (
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
                            calculateYearEndRecon(values) !== 0
                              ? "text-gray-300 font-medium"
                              : "text-gray-500"
                          )}>
                            {formatCurrency(calculateYearEndRecon(values))}
                          </span>
                        </td>
                        <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                          <span className={cn(
                            calculateYearEndReconSplit(values) !== 0
                              ? "text-gray-300 font-medium"
                              : "text-gray-500"
                          )}>
                            {formatCurrency(calculateYearEndReconSplit(values))}
                          </span>
                        </td>
                        <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                          <span className={cn(
                            calculateGrandTotal(values) !== 0
                              ? "text-gray-300"
                              : "text-gray-400"
                          )}>
                            {formatCurrency(calculateGrandTotal(values))}
                          </span>
                        </td>
                      </tr>
                    );
                  } else {
                    // Render expandable category
                    const category = item.category!;
                    const categoryTotal = category.total ? calculateTotal(category.rows) : null;

                    return (
                      <React.Fragment key={itemIndex}>
                        {/* Category Header */}
                        <tr
                          className="bg-[#151515] border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                          onClick={() => toggleCategory(category.label)}
                        >
                          <td className="px-3 py-3 text-sm font-semibold text-[#EAEB80] sticky left-0 bg-[#151515] hover:bg-[#151515] z-[50] border-r border-[#2a2a2a]">
                            <div className="flex items-center gap-2">
                              <span className="w-4 text-center flex-shrink-0">{category.isExpanded ? "–" : "+"}</span>
                              <span className="whitespace-nowrap">{category.label}</span>
                            </div>
                          </td>
                          {months.map((_, monthIndex) => (
                            <td
                              key={monthIndex}
                              className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a]"
                            >
                              {categoryTotal
                                ? formatCurrency(categoryTotal[monthIndex])
                                : formatCurrency(0)}
                            </td>
                          ))}
                          {categoryTotal && (
                            <>
                              <td className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(calculateYearEndRecon(categoryTotal))}
                              </td>
                              <td className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(calculateYearEndReconSplit(categoryTotal))}
                              </td>
                              <td className="text-right px-2 py-2 text-sm font-semibold text-[#EAEB80] border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(calculateGrandTotal(categoryTotal))}
                              </td>
                            </>
                          )}
                          {!categoryTotal && (
                            <>
                              <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(0)}
                              </td>
                              <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(0)}
                              </td>
                              <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                                {formatCurrency(0)}
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
                              <td className="px-3 py-2 pl-12 text-sm text-gray-300 sticky left-0 bg-[#0f0f0f] z-[50] border-r border-[#2a2a2a]">
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
                      </React.Fragment>
                    );
                  }
                })}
              </tbody>
            </table>
            <div className="h-8 pb-4"></div>
          </div>
        </div>

        {/* Turo Earnings Chart Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-300">
                Turo Earnings, Upcoming Earnings, Reimbursements, Missed Earnings Chart
              </h2>
              <div className="flex items-center gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <SelectValue />
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
                <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-3 gap-4">
              {months.map((month, index) => (
                <div key={index} className="flex flex-col">
                  {/* Month Label */}
                  <div className="bg-[#EAEB80] text-black px-3 py-2 text-sm font-medium rounded-t flex justify-between items-center">
                    <span>{month}</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  {/* Placeholder Image Area */}
                  <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-b p-8 flex items-center justify-center min-h-[200px]">
                    <ImageIcon className="w-16 h-16 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graphs and Charts Report Section (moved from Graphs and Charts Report page) */}
        <GraphsChartsReportSection className="mb-6" />
      </div>
    </AdminLayout>
  );
}

