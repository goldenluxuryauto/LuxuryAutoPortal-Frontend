import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Plus, Download, FileText } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
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

export default function NADADepreciationPage() {
  const [, params] = useRoute("/admin/cars/:id/depreciation");
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

  // NADA Depreciation Schedule 2018 data
  const nadaRows = [
    { label: "NADA - Retail", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Clean", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Average", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Rough", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "MILES", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], isMiles: true },
  ];

  // NADA Depreciation Schedule 2019 data
  const nada2019Rows = [
    { label: "NADA - Retail", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Clean", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Average", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA - Rough", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "MILES", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], isMiles: true },
    { label: "Amounted Owed on Car $", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Total Equity in Car", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], isBold: true },
  ];

  // NADA Change % 2018-2019 data
  const nadaChangeRows = [
    { label: "NADA Change Retail %", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA Change Clean %", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA Change Average %", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "NADA Change Rough", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];

  const calculateAverage = (values: number[]): number => {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return values.length > 0 ? sum / values.length : 0;
  };

  // Prepare chart data for NADA Depreciation Schedule 2018
  const chartData = months.map((month, index) => {
    const monthShort = month.split(' ')[0]; // Get "Jan", "Feb", etc.
    return {
      month: monthShort,
      'NADA - Retail': nadaRows[0].values[index],
      'NADA - Clean': nadaRows[1].values[index],
      'NADA - Average': nadaRows[2].values[index],
      'NADA - Rough': nadaRows[3].values[index],
    };
  });

  // Prepare chart data for NADA Change % 2018-2019
  const changeChartData = months.map((month, index) => {
    const monthShort = month.split(' ')[0]; // Get "Jan", "Feb", etc.
    return {
      month: monthShort,
      'NADA - Retail': nadaChangeRows[0].values[index],
      'NADA - Clean': nadaChangeRows[1].values[index],
      'NADA - Average': nadaChangeRows[2].values[index],
      'NADA - Rough': nadaChangeRows[3].values[index],
    };
  });

  // Prepare chart data for NADA Depreciation Schedule 2019
  const chart2019Data = months.map((month, index) => {
    const monthShort = month.split(' ')[0]; // Get "Jan", "Feb", etc.
    return {
      month: monthShort,
      'NADA - Retail': nada2019Rows[0].values[index],
      'NADA - Clean': nada2019Rows[1].values[index],
      'NADA - Average': nada2019Rows[2].values[index],
      'NADA - Rough': nada2019Rows[3].values[index],
    };
  });

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
          <span className="text-gray-300">NADA Depreciation Schedule</span>
        </div>

        {/* Header Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
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
            {/* Action Buttons */}
            <div className="flex gap-2 ml-4">
              <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a]">
                <FileText className="w-4 h-4 mr-2" />
                Log
              </Button>
            </div>
          </div>
        </div>

        {/* NADA Depreciation Schedule Header with Year Filter */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic">NADA Depreciation Schedule</h1>
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

        {/* NADA Depreciation Schedule 2018 Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-gray-300">NADA Depreciation Schedule 2018</h2>
            <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="border-collapse w-full table-fixed" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5.5%' }} />)}
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Current Cost of Vehicle
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a]">
                    Current
                  </th>
                </tr>
              </thead>
              <tbody>
                {nadaRows.map((row, rowIndex) => (
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
                        {row.isMiles ? value.toLocaleString() : formatCurrency(value)}
                      </td>
                    ))}
                    <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                      <span className={cn(
                        row.values[row.values.length - 1] !== 0
                          ? "text-gray-300 font-medium"
                          : "text-gray-500"
                      )}>
                        {row.isMiles 
                          ? row.values[row.values.length - 1].toLocaleString()
                          : formatCurrency(row.values[row.values.length - 1])
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NADA Depreciation Schedule 2019 Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-[#EAEB80]">NADA Depreciation Schedule 2019</h2>
            <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="border-collapse w-full table-fixed" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5.5%' }} />)}
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Current Cost of Vehicle
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a]">
                    Current
                  </th>
                </tr>
              </thead>
              <tbody>
                {nada2019Rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors"
                  >
                    <td className={cn(
                      "px-3 py-2 text-sm sticky left-0 z-[50] border-r border-[#2a2a2a]",
                      row.isBold 
                        ? "font-semibold text-[#EAEB80] bg-[#151515]" 
                        : "text-gray-300 bg-[#0f0f0f]"
                    )}>
                      <span className="whitespace-nowrap">{row.label}</span>
                    </td>
                    {row.values.map((value, monthIndex) => (
                      <td
                        key={monthIndex}
                        className={cn(
                          "text-right px-2 py-2 text-sm border-l border-[#2a2a2a]",
                          row.isBold && "font-semibold",
                          value !== 0
                            ? row.isBold ? "text-[#EAEB80]" : "text-gray-300 font-medium"
                            : row.isBold ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        {row.isMiles ? value.toLocaleString() : formatCurrency(value)}
                      </td>
                    ))}
                    <td className={cn(
                      "text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]",
                      row.isBold && "font-semibold"
                    )}>
                      <span className={cn(
                        row.values[row.values.length - 1] !== 0
                          ? row.isBold ? "text-[#EAEB80]" : "text-gray-300 font-medium"
                          : row.isBold ? "text-gray-400" : "text-gray-500"
                      )}>
                        {row.isMiles 
                          ? row.values[row.values.length - 1].toLocaleString()
                          : formatCurrency(row.values[row.values.length - 1])
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NADA Change % 2018-2019 Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-gray-300">NADA Change % 2018-2019</h2>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="border-collapse w-full table-fixed" style={{ minWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5%' }} />)}
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Category
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a]">
                    Average
                  </th>
                  <th className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a]">
                    Current
                  </th>
                </tr>
              </thead>
              <tbody>
                {nadaChangeRows.map((row, rowIndex) => {
                  const average = calculateAverage(row.values);
                  const current = row.values[row.values.length - 1];
                  return (
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
                          {formatPercentage(value)}
                        </td>
                      ))}
                      <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                        <span className={cn(
                          average !== 0
                            ? "text-gray-300 font-medium"
                            : "text-gray-500"
                        )}>
                          {formatPercentage(average)}
                        </span>
                      </td>
                      <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                        <span className={cn(
                          current !== 0
                            ? "text-gray-300 font-medium"
                            : "text-gray-500"
                        )}>
                          {formatPercentage(current)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* NADA Depreciation Schedule Graphs */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">NADA Depreciation Schedule Graphs</h2>
            <h3 className="text-md font-medium text-[#EAEB80]">NADA Depreciation Schedule 2018</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                  domain={[-1.0, 1.0]}
                  ticks={[-1.0, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                  iconType="square"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Retail"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                  name="NADA - Retail"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Clean"
                  stroke="#1e293b"
                  strokeWidth={2}
                  dot={{ fill: '#1e293b', r: 4 }}
                  name="NADA - Clean"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Average"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: '#eab308', r: 4 }}
                  name="NADA - Average"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Rough"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  name="NADA - Rough"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NADA Change % 2018-2019 Chart */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="text-md font-medium text-[#EAEB80]">NADA Change % 2018 - 2019</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={changeChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                  domain={[-1.0, 1.0]}
                  ticks={[-1.0, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                  }}
                  formatter={(value: number) => formatPercentage(value)}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                  iconType="square"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Retail"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={{ fill: '#ea580c', r: 4 }}
                  name="NADA - Retail"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Clean"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ fill: '#38bdf8', r: 4 }}
                  name="NADA - Clean"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Average"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: '#eab308', r: 4 }}
                  name="NADA - Average"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Rough"
                  stroke="#1e40af"
                  strokeWidth={2}
                  dot={{ fill: '#1e40af', r: 4 }}
                  name="NADA - Rough"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NADA Depreciation Schedule 2019 Chart */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="text-md font-medium text-[#EAEB80]">NADA Depreciation Schedule 2019</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chart2019Data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                  domain={[-1.0, 1.0]}
                  ticks={[-1.0, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                  iconType="square"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Retail"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                  name="NADA - Retail"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Clean"
                  stroke="#1e293b"
                  strokeWidth={2}
                  dot={{ fill: '#1e293b', r: 4 }}
                  name="NADA - Clean"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Average"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: '#eab308', r: 4 }}
                  name="NADA - Average"
                />
                <Line
                  type="monotone"
                  dataKey="NADA - Rough"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  name="NADA - Rough"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

