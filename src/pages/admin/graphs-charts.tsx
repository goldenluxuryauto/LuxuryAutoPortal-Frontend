import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink } from "lucide-react";
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

export default function GraphsChartsPage() {
  const [, params] = useRoute("/admin/cars/:id/graphs");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [selectedGraph, setSelectedGraph] = useState<string>("Total Rental Income and Expenses");
  const [fromYear, setFromYear] = useState<string>("2026");
  const [toYear, setToYear] = useState<string>("2026");

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

  // Prepare chart data - currently empty (no data)
  const chartData = [
    { year: fromYear === toYear ? fromYear : `${fromYear}-${toYear}`, "Rental Income": 0, "Total Expenses": 0 },
  ];

  const hasData = false; // No data available

  return (
    <AdminLayout>
      <div className="flex flex-col w-full overflow-x-hidden">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setLocation("/cars")}
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
          <span className="text-gray-300">Graphs and Charts Report</span>
        </div>

        {/* Header Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Car Specifications & Turo Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Specifications</h3>
              <div className="space-y-2 mb-4">
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
        </div>

        {/* Graphs and Charts Report Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-6">Graphs and Charts Report</h1>
          
          {/* Graph Selection and Date Range */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <div className="flex-1">
                <Label className="text-sm text-gray-400 mb-2 block">Select Graphs and Charts</Label>
                <Select value={selectedGraph} onValueChange={setSelectedGraph}>
                  <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <SelectItem value="Total Rental Income and Expenses">Total Rental Income and Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <Label className="text-sm text-gray-400 mb-2 block">From</Label>
                  <Select value={fromYear} onValueChange={setFromYear}>
                    <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
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
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400 mb-2 block">To</Label>
                  <Select value={toYear} onValueChange={setToYear}>
                    <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
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
                </div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-300 text-center mb-6">
                {selectedGraph}
              </h2>
              
              {hasData ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                      domain={[0, 1.0]}
                      ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        color: '#fff',
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#9ca3af' }}
                      iconType="square"
                    />
                    <Line
                      type="monotone"
                      dataKey="Rental Income"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ fill: '#38bdf8', r: 4 }}
                      name="Rental Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="Total Expenses"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa', r: 4 }}
                      name="Total Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="relative" style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        domain={[0, 1.0]}
                        ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          color: '#fff',
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#9ca3af' }}
                        iconType="square"
                      />
                      <Line
                        type="monotone"
                        dataKey="Rental Income"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={{ fill: '#38bdf8', r: 4 }}
                        name="Rental Income"
                      />
                      <Line
                        type="monotone"
                        dataKey="Total Expenses"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        dot={{ fill: '#a78bfa', r: 4 }}
                        name="Total Expenses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex gap-8">
                      <div className="bg-black/80 px-4 py-2 rounded text-white text-sm">
                        No data
                      </div>
                      <div className="bg-black/80 px-4 py-2 rounded text-white text-sm">
                        No data
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

