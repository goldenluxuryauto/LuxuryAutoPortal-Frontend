import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CarHeader from "./components/CarHeader";
import IncomeExpenseTable from "./components/IncomeExpenseTable";
import TableActions from "./components/TableActions";
import { IncomeExpenseProvider } from "./context/IncomeExpenseContext";
import type { IncomeExpenseData } from "./types";
import ModalEditManagementSplit from "./modals/ModalEditManagementSplit";
import ModalEditIncomeExpense from "./modals/ModalEditIncomeExpense";
import ModalEditDirectDelivery from "./modals/ModalEditDirectDelivery";
import ModalEditCOGS from "./modals/ModalEditCOGS";
import ModalEditParkingFeeLabor from "./modals/ModalEditParkingFeeLabor";
import ModalEditReimbursedBills from "./modals/ModalEditReimbursedBills";
import ModalEditHistory from "./modals/ModalEditHistory";
import ModalEditParkingAirportQB from "./modals/ModalEditParkingAirportQB";
import ModalEditDynamicSubcategory from "./modals/ModalEditDynamicSubcategory";

interface IncomeExpensesPageProps {
  carIdFromRoute?: number; // When accessed from /admin/cars/:id/income-expense
}

export default function IncomeExpensesPage({ carIdFromRoute }: IncomeExpensesPageProps) {
  const [, setLocation] = useLocation();

  // Get car ID from URL query parameter OR route parameter
  const carIdFromQuery = useMemo(() => {
    if (carIdFromRoute) return carIdFromRoute; // Priority to route param
    
    if (typeof window === "undefined") return null;
    const carParam = new URLSearchParams(window.location.search).get("car");
    if (!carParam) return null;
    const parsed = parseInt(carParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [carIdFromRoute]);

  const isCarFocused = !!carIdFromQuery;
  const isFromRoute = !!carIdFromRoute; // User came from View Car menu
  const isAdminAllCarsView = !isCarFocused; // Admin viewing all cars (Income and Expenses menu)

  const [selectedCar, setSelectedCar] = useState<string>(
    carIdFromQuery ? String(carIdFromQuery) : "all"
  );
  
  // Get current year and generate year options (past 5 years + current + future 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // Update selected car when carIdFromQuery changes
  useEffect(() => {
    if (carIdFromQuery) {
      setSelectedCar(String(carIdFromQuery));
    }
  }, [carIdFromQuery]);

  // Fetch car details if carIdFromQuery is present
  const { data: carData, isLoading: isCarLoading, error: carError } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/cars", carIdFromQuery],
    queryFn: async () => {
      if (!carIdFromQuery) throw new Error("Invalid car ID");
      const response = await fetch(buildApiUrl(`/api/cars/${carIdFromQuery}`), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch car");
      return response.json();
    },
    enabled: !!carIdFromQuery,
    retry: false,
  });

  const car = carData?.data;

  // Fetch onboarding data for additional car info
  const { data: onboardingData } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/onboarding/vin", car?.vin, "onboarding"],
    queryFn: async () => {
      if (!car?.vin) throw new Error("No VIN");
      const response = await fetch(
        buildApiUrl(`/api/onboarding/vin/${encodeURIComponent(car.vin)}`),
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 404) return { success: true, data: null };
        throw new Error("Failed to fetch onboarding data");
      }
      return response.json();
    },
    enabled: !!car?.vin,
    retry: false,
  });

  const onboarding = onboardingData?.data;

  // Fetch all cars for dropdown (only if admin all-cars view)
  const { data: carsData } = useQuery({
    queryKey: ["/api/cars"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/cars"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch cars");
      return response.json();
    },
    enabled: isAdminAllCarsView, // Only fetch if viewing all cars
  });

  const cars = carsData?.data || [];

  if (isCarLoading && isCarFocused) {
    return (
      <AdminLayout>
        <CarDetailSkeleton />
      </AdminLayout>
    );
  }

  if (isCarFocused && (carError || !car)) {
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

  // Determine which carId to use for data fetching
  const activeCarId = selectedCar !== "all" ? parseInt(selectedCar) : null;

  // Show different UI based on whether this is per-car view or all-cars admin view
  if (!activeCarId) {
    // Admin "Income and Expenses" (plural) - All cars view with car selector
    return (
      <AdminLayout>
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-serif text-[#EAEB80] italic mb-2">
              Income and Expenses
            </h1>
            <p className="text-gray-400 text-sm">
              Financial tracking and expense management - All Cars
            </p>
          </div>

          {/* Car Selector and Year Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[400px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Select a car
              </label>
              <Select value={selectedCar} onValueChange={setSelectedCar}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Select a car" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">-- Select a Car --</SelectItem>
                  {cars.map((carItem: any) => (
                    <SelectItem key={carItem.id} value={carItem.id.toString()}>
                      {carItem.makeModel || ""} - {carItem.vin || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  {yearOptions.map((yr) => (
                    <SelectItem key={yr} value={String(yr)}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message to select a car */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">Please select a car to view income and expenses</p>
            <p className="text-gray-500 text-sm">
              Choose a car from the dropdown above to see detailed financial data
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Per-car view (both from route and from admin selection)
  return (
    <IncomeExpenseProvider carId={activeCarId} year={selectedYear}>
      <AdminLayout>
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* Breadcrumb Navigation - Different based on source */}
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            {isFromRoute ? (
              // From View Car menu
              <>
                <button
                  onClick={() => setLocation("/cars")}
                  className="text-gray-400 hover:text-[#EAEB80] transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Cars</span>
                </button>
                <span className="text-gray-500">/</span>
                <button
                  onClick={() => setLocation(`/admin/view-car/${activeCarId}`)}
                  className="text-gray-400 hover:text-[#EAEB80] transition-colors"
                >
                  View Car
                </button>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">Income and Expense</span>
              </>
            ) : (
              // From admin Income and Expenses menu
              <>
                <button
                  onClick={() => setLocation("/admin/income-expenses")}
                  className="text-gray-400 hover:text-[#EAEB80] transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Income and Expenses</span>
                </button>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{car?.makeModel || "Car Details"}</span>
              </>
            )}
          </div>

          {/* Car Header */}
          <div className="flex-shrink-0 mb-2">
            <CarHeader car={car} onboarding={onboarding} />
          </div>

          {/* Page Title and Actions */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h1 className="text-xl font-semibold text-white">INCOME AND EXPENSES</h1>
            <div className="flex items-center gap-2">
              {/* Show car selector only in admin all-cars view */}
              {!isFromRoute && (
                <div className="w-[300px]">
                  <Select value={selectedCar} onValueChange={setSelectedCar}>
                    <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm">
                      <SelectValue placeholder="Select car" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                      {cars.map((carItem: any) => (
                        <SelectItem key={carItem.id} value={carItem.id.toString()}>
                          {carItem.makeModel || ""} - {carItem.vin || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <TableActions
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                carId={activeCarId}
                car={car}
              />
            </div>
          </div>

          {/* Main Content Area - No scroll on page, only table scrolls */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <IncomeExpenseTable year={selectedYear} />
          </div>

          {/* Category-specific Edit Modals */}
          <ModalEditManagementSplit />
          <ModalEditIncomeExpense />
          <ModalEditDirectDelivery />
          <ModalEditCOGS />
          <ModalEditParkingFeeLabor />
          <ModalEditReimbursedBills />
          <ModalEditHistory />
          <ModalEditParkingAirportQB />
          <ModalEditDynamicSubcategory />
        </div>
      </AdminLayout>
    </IncomeExpenseProvider>
  );
}
