import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, ExternalLink, Download, Plus, Minus } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";

interface CarDetail {
  id: number;
  vin: string;
  makeModel: string;
  licensePlate?: string;
  year?: number;
  mileage: number;
  status: "ACTIVE" | "INACTIVE";
  clientId?: number | null;
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
  } | null;
  turoLink?: string | null;
  adminTuroLink?: string | null;
  fuelType?: string | null;
  tireSize?: string | null;
  oilType?: string | null;
}

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TotalsPage() {
  const [, params] = useRoute("/admin/cars/:id/totals");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [filterType, setFilterType] = useState<string>("Year");
  const [fromYear, setFromYear] = useState<string>("2026");
  const [toYear, setToYear] = useState<string>("2026");

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: CarDetail;
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

  // Fetch totals data (placeholder - will be replaced with actual API call)
  const { data: totalsData } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/cars", carId, "totals", filterType, fromYear, toYear],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      // TODO: Replace with actual API endpoint
      const url = buildApiUrl(`/api/cars/${carId}/totals?filter=${filterType}&from=${fromYear}&to=${toYear}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        // Return empty data if endpoint doesn't exist yet
        return { success: true, data: null };
      }
      return response.json();
    },
    enabled: !!carId,
    retry: false,
  });

  const totals = totalsData?.data || null;

  // Calculate totals for each category (placeholder values)
  const calculateTotal = (category: string): number => {
    if (!totals) return 0;
    // TODO: Replace with actual calculation based on API response
    return 0;
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
            onClick={() => setLocation("/cars")}
            className="mt-4 text-[#EAEB80] hover:underline"
          >
            ← Back to Cars
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

  const categories = [
    { id: "expenses", label: "EXPENSES", total: calculateTotal("expenses") },
    { id: "income", label: "INCOME", total: calculateTotal("income") },
    { id: "operating-expenses-direct", label: "OPERATING EXPENSES (DIRECT DELIVERY)", total: calculateTotal("operating-expenses-direct") },
    { id: "operating-expenses-cogs", label: "OPERATING EXPENSES (COGS - Per Vehicle)", total: calculateTotal("operating-expenses-cogs") },
    { id: "gla", label: "GLA PARKING FEE & LABOR CLEANING", total: calculateTotal("gla") },
    { id: "operating-expenses-office", label: "OPERATING EXPENSES (Office Support)", total: calculateTotal("operating-expenses-office") },
    { id: "history", label: "HISTORY OF THE CARS", total: calculateTotal("history") },
    { id: "payments", label: "PAYMENT HISTORY", total: calculateTotal("payments") },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
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
            <h1 className="text-2xl font-bold text-white">Totals</h1>
            {car && (
              <p className="text-sm text-gray-400 mt-1">
                Car: {car.makeModel || "Unknown Car"}
              </p>
            )}
          </div>
        </div>

        {/* Car and Owner Information Header */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Totals</h1>
            </div>
            <Button
              variant="outline"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] flex items-center gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
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
                  {car?.clientId ? (
                    <button
                      onClick={() => setLocation(`/admin/clients/${car.clientId}`)}
                      className="text-[#EAEB80] hover:text-[#d4d570] hover:underline transition-colors text-xs sm:text-sm break-words cursor-pointer"
                    >
                      {ownerName}
                    </button>
                  ) : (
                    <span className="text-white text-xs sm:text-sm break-words">{ownerName}</span>
                  )}
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

        {/* Filters Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <SelectItem value="Year">Year</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
                <SelectItem value="Quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[120px]">
                <SelectValue placeholder="From" />
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

            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[120px]">
                <SelectValue placeholder="To" />
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

        {/* Totals Categories */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden" style={{ overflowY: 'auto' }}>
          <Accordion type="multiple" className="w-full">
            {categories.map((category) => {
              // Special handling for EXPENSES category
              if (category.id === "expenses") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Category Header */}
                        <div className="flex justify-between text-gray-300 text-sm font-bold mb-2">
                          <span>Car Management and Car Owner Split</span>
                        </div>
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Car Management Split</span>
                          <span className="text-white font-medium">
                            {formatCurrency(totals?.carManagementSplit || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Car Owner Split</span>
                          <span className="text-white font-medium">
                            {formatCurrency(totals?.carOwnerSplit || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for OPERATING EXPENSES (DIRECT DELIVERY) category
              if (category.id === "operating-expenses-direct") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor - Car Cleaning</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesDirect?.laborCarCleaning || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor - Driver</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesDirect?.laborDriver || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Parking - Airport</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesDirect?.parkingAirport || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Taxi/Uber/Lyft/Lime</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesDirect?.taxiUberLyftLime || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                          <span>Total OPERATING EXPENSES (Direct Delivery)</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.operatingExpensesDirect?.total || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for OPERATING EXPENSES (COGS - Per Vehicle) category
              if (category.id === "operating-expenses-cogs") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Auto Body Shop / Wreck</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.autoBodyShop || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Alignment</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.alignment || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Battery</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.battery || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Brakes</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.brakes || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Car Payment</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.carPayment || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Car Insurance</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.carInsurance || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Car Seats</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.carSeats || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Cleaning Supplies / Tools</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.cleaningSupplies || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Emissions</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.emissions || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>GPS System</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.gpsSystem || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Keys & Fob</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.keysFob || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor - Cleaning</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.laborDetailing || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Parking Airport (Reimbursed - GLA - Client Owner Rentals)</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.parkingAirport || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Uber/Lyft/Lime - Not Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.uberNotReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Uber/Lyft/Lime - Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.uberReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Gas - Service Run</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.gasServiceRun || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Gas Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.gasReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Gas - Not Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.gasNotReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Electric Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.electricReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Electric - Not Reimbursed</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.electricNotReimbursed || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Windshield</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.windshield || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Wipers</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.wipers || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Uber/Lyft/Lime</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.uberLyftLime || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Towing / Impound Fees</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.towingImpoundFees || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Tired Air Station</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.tiredAirStation || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Tires</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.tires || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Oil/Lube</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.oilLube || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Parts</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.parts || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Ski Racks</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.skiRacks || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Tickets & Tolls</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.ticketsTolls || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Mechanic</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.mechanic || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>License & Registration</span>
                          <span className="text-white">
                            {formatCurrency(totals?.expenses?.licenseRegistration || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                          <span className="font-bold">Total OPERATING EXPENSES (COGS - Per Vehicle)</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.expenses?.totalOperatingExpenses || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for INCOME category
              if (category.id === "income") {
                const negativeBalance = totals?.income?.negativeBalance || 0;
                const formatNegativeCurrency = (value: number): string => {
                  if (value < 0) {
                    return `$ (${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                  }
                  return formatCurrency(value);
                };

                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Income Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Rental Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.rentalIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Delivery Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.deliveryIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Electric Prepaid Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.electricPrepaidIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Smoking Fines</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.smokingFines || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Gas Prepaid Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.gasPrepaidIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Miles Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.milesIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Ski Racks Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.skiRacksIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Child Seat Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.childSeatIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Coolers Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.coolersIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Income Insurance and Client Wrecks</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.incomeInsurance || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Other Income</span>
                          <span className="text-white">
                            {formatCurrency(totals?.income?.otherIncome || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Negative Balance Carry Over</span>
                          <span className={negativeBalance < 0 ? "text-[#EAEB80]" : "text-white"}>
                            {formatNegativeCurrency(negativeBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm pt-2 border-t border-[#2a2a2a]">
                          <span className="font-medium">Car Management Total Expenses</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(totals?.income?.carManagementTotalExpenses || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span className="font-medium">Car Owner Total Expenses</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(totals?.income?.carOwnerTotalExpenses || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                          <span>Total Expenses</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.income?.totalExpenses || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold">
                          <span>Car Payment</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.income?.carPayment || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold">
                          <span>Total Profit</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.income?.totalProfit || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for GLA PARKING FEE & LABOR CLEANING category
              if (category.id === "gla") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>GLA Labor - Cleaning</span>
                          <span className="text-white">
                            {formatCurrency(totals?.gla?.laborCleaning || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>GLA Parking Fee</span>
                          <span className="text-white">
                            {formatCurrency(totals?.gla?.parkingFee || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                          <span className="font-bold">Total GLA PARKING FEE & LABOR CLEANING</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.gla?.total || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for OPERATING EXPENSES (Office Support) category
              if (category.id === "operating-expenses-office") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Accounting & Professional Fees</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.accountingProfessionalFees || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Advertizing</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.advertizing || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Bank Charges</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.bankCharges || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Detail Mobile</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.detailMobile || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Charitable Contributions</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.charitableContributions || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Computer & Internet</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.computerInternet || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Delivery, Postage & Freight</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.deliveryPostageFreight || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Detail Shop Equipment</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.detailShopEquipment || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Dues & Subscription</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.duesSubscription || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>General and administrative (G&A)</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.generalAdministrative || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Health & Wellness</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.healthWellness || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor - Human Resources</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.laborHumanResources || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor - Marketing</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.laborMarketing || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Office Rent</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.officeRent || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Outside & Staff Contractors</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.outsideStaffContractors || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Park n Jet Booth</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.parknJetBooth || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Printing</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.printing || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Referral</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.referral || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Repairs & Maintenance</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.repairsMaintenance || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Sales Tax</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.salesTax || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Security Cameras</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.securityCameras || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Supplies & Materials</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.suppliesMaterials || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Taxes and License</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.taxesLicense || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Telephone</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.telephone || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Travel</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.travel || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor Software</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.laborSoftware || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Legal & Professional</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.legalProfessional || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Marketing</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.marketing || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Meals & Entertainment</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.mealsEntertainment || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Office Expense</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.officeExpense || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Labor Sales</span>
                          <span className="text-white">
                            {formatCurrency(totals?.operatingExpensesOffice?.laborSales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm font-bold pt-2 border-t border-[#2a2a2a]">
                          <span className="font-bold">Total OPERATING EXPENSES (Office Support)</span>
                          <span className="text-white font-bold">
                            {formatCurrency(totals?.operatingExpensesOffice?.total || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-base font-extrabold">
                          <span className="font-extrabold">Total Expenses</span>
                          <span className="text-white font-extrabold">
                            {formatCurrency(totals?.operatingExpensesOffice?.totalExpenses || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for HISTORY OF THE CARS category
              if (category.id === "history") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Days Rented</span>
                          <span className="text-white font-medium">
                            {totals?.history?.daysRented || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Cars Available For Rent</span>
                          <span className="text-white font-medium">
                            {totals?.history?.carsAvailableForRent || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>Trips Taken</span>
                          <span className="text-white font-medium">
                            {totals?.history?.tripsTaken || 0}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Special handling for PAYMENT HISTORY category
              if (category.id === "payments") {
                return (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                          <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                          <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                      <div className="space-y-2 pt-2">
                        {/* Child Items */}
                        <div className="flex justify-between text-gray-300 text-sm">
                          <span>{fromYear} - {toYear}</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(totals?.payments?.total || 0)}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              // Default handling for other categories
              return (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 last:mb-0"
                >
                  <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#2a2a2a] transition-colors [&>svg]:hidden">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#EAEB80] group-data-[state=open]:hidden" />
                        <Minus className="w-4 h-4 text-[#EAEB80] hidden group-data-[state=open]:block" />
                        <span className="text-white font-medium text-sm sm:text-base">{category.label}</span>
                      </div>
                      <span className="text-white font-semibold text-sm sm:text-base">TOTALS</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-6 pb-4 bg-[#0a0a0a]">
                    <div className="space-y-2 pt-2">
                      {/* Placeholder content - will be replaced with actual data from API */}
                      <div className="flex justify-between text-gray-300 text-sm">
                        <span>No data available</span>
                        <span className="text-white">{formatCurrency(category.total)}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </AdminLayout>
  );
}

