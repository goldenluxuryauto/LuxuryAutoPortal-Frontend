import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Info, Folder } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import {
  BarChart,
  Bar,
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

export default function PaymentCalculatorPage() {
  const [, params] = useRoute("/admin/cars/:id/calculator");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;

  const [autoLoanAmount, setAutoLoanAmount] = useState<number>(0);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(0);
  const [termOfLoan, setTermOfLoan] = useState<number>(0);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>("");
  const [frequencyOfPayment, setFrequencyOfPayment] = useState<string>("");

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

  // Chart data for balance visualization
  const chartData = [
    { name: "Balance", value: 0 },
  ];

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
          <span className="text-gray-300">Payment Calculator</span>
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
                  <span className="text-xs text-gray-500">VIN#:</span>
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
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Contact Information</h3>
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

        {/* Payment Calculator Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-6">Payment Calculator</h1>
          
          {/* Warning Banner */}
          {!firstPaymentDate && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-200">
                The First Payment Date is unspecified therefore the initial value in the table will be the current date of the system.
              </p>
            </div>
          )}

          {/* Calculator Inputs and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column: Inputs and Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Inputs Section */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Inputs</h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Auto Loan Amount</Label>
                    <Input
                      type="number"
                      value={autoLoanAmount}
                      onChange={(e) => setAutoLoanAmount(parseFloat(e.target.value) || 0)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Annual Interest Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={annualInterestRate}
                      onChange={(e) => setAnnualInterestRate(parseFloat(e.target.value) || 0)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Term of Loan in Years</Label>
                    <Input
                      type="number"
                      value={termOfLoan}
                      onChange={(e) => setTermOfLoan(parseInt(e.target.value) || 0)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">First Payment Date</Label>
                    <Input
                      type="date"
                      value={firstPaymentDate}
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Frequency of Payment</Label>
                    <Select value={frequencyOfPayment} onValueChange={setFrequencyOfPayment}>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Effect of Extra Payments Section */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Effect of Extra Payments</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Total Payments</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Total Interest</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Reduced Interest</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Number of Payments</span>
                    <span className="text-sm text-gray-300 font-medium">0</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-300">Last Payment Date</span>
                    <span className="text-sm text-gray-500 font-medium">--</span>
                  </div>
                </div>
              </div>

              {/* Summary (with no extra payments) Section */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Summary (with no extra payments)</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Number of Payments</span>
                    <span className="text-sm text-gray-300 font-medium">0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Rate (per period)</span>
                    <span className="text-sm text-gray-300 font-medium">{formatPercentage(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Payment (per period)</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-gray-300">Total Interest</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-300">Total Payments</span>
                    <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Graph and Instructions */}
            <div className="space-y-6">
              {/* Graph */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="name" 
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
                    <Bar dataKey="value" fill="#eab308" name="Balance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Using the Payment Calculator Text */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Using the Payment Calculator</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  This Payment Calculator creates a payment schedule for a fixed-rate auto loan, with optional extra payments. Use the Payment Calculator to compare different terms, rates, and loan amounts. The Payment Calculator allows complete flexibility in how you make additional payments. The payment is rounded to the nearest cent. The last payment is adjusted to bring the balance to zero.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Schedule Table */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-4">Payment Schedule</h2>
              <div className="w-full overflow-x-auto">
                <table className="border-collapse w-full" style={{ minWidth: '800px' }}>
                  <thead className="bg-[#1a1a1a]">
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">No.</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Due Date</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Payment Due</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Additional Payment</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Interest</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Principal</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Folder className="w-12 h-12 text-gray-600" />
                          <span className="text-gray-500 text-sm">No data</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Ending Balance */}
              <div className="mt-6 pt-4 border-t border-[#2a2a2a] flex justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-300">Ending Balance</span>
                  <span className="text-sm font-semibold text-[#EAEB80]">{formatCurrency(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

