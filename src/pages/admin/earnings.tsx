                                                                                                                                                                                import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Plus, Image as ImageIcon, ChevronDown, ChevronRight, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { GraphsChartsReportSection } from "@/pages/admin/components/GraphsChartsReportSection";
import type { IncomeExpenseData } from "@/pages/admin/income-expenses/types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

// Helper to get value by month from income-expense data
const getMonthValue = (arr: any[], month: number, field: string): number => {
  if (!arr || !Array.isArray(arr)) return 0;
  const item = arr.find((x) => x && x.month === month);
  if (!item) return 0;
  const value = item[field];
  if (value === null || value === undefined) return 0;
  const numValue = Number(value);
  return isNaN(numValue) ? 0 : numValue;
};

// Helper to calculate total from array of values
const calculateTotal = (values: number[]): number => {
  return values.reduce((sum, val) => sum + val, 0);
};

export default function EarningsPage() {
  const [, params] = useRoute("/admin/cars/:id/earnings");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [expandedSections, setExpandedSections] = useState({
    managementOwner: true,
    incomeExpenses: true,
    history: true,
    rentalValue: true,
    directDelivery: true,
    cogs: true,
    parkingFeeLabor: true,
    reimbursedBills: true,
  });
  const [uploadingChart, setUploadingChart] = useState<{ [month: number]: boolean }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const months = generateMonths(selectedYear);

  // Fetch user data to check if admin or client
  const { data: userData } = useQuery<{ user?: { isAdmin?: boolean; isClient?: boolean } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const isAdmin = userData?.user?.isAdmin === true;

  // Fetch car data
  const { data: carData, isLoading: isCarLoading, error: carError } = useQuery<{
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

  const car = carData?.data;

  // Fetch income-expenses data
  const { data: incomeExpenseData, isLoading: isIncomeExpenseLoading } = useQuery<{
    success: boolean;
    data: IncomeExpenseData;
  }>({
    queryKey: ["/api/income-expense", carId, selectedYear],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const response = await fetch(
        buildApiUrl(`/api/income-expense/${carId}/${selectedYear}`),
        { credentials: "include" }
      );
      if (!response.ok) {
        // Return empty data if not found
        return { success: true, data: null as any };
      }
      return response.json();
    },
    enabled: !!carId && !!selectedYear,
    retry: false,
  });

  const incomeExpenseDataValue = incomeExpenseData?.data;

  // Fetch previous year December data for January calculation
  const previousYear = String(parseInt(selectedYear) - 1);
  const { data: previousYearData } = useQuery<{
    success: boolean;
    data: IncomeExpenseData;
  }>({
    queryKey: ["/api/income-expense", carId, previousYear],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const response = await fetch(
        buildApiUrl(`/api/income-expense/${carId}/${previousYear}`),
        { credentials: "include" }
      );
      if (!response.ok) {
        // If previous year data doesn't exist, return empty data
        return { success: true, data: null as any };
      }
      return response.json();
    },
    retry: false,
    enabled: !!carId && !!selectedYear,
  });

  const prevYearDecData = previousYearData?.data;

  // Fetch dynamic subcategories
  const { data: dynamicSubcategoriesData } = useQuery<{
    success: boolean;
    data: {
      directDelivery: any[];
      cogs: any[];
      parkingFeeLabor: any[];
      reimbursedBills: any[];
    };
  }>({
    queryKey: ["/api/income-expense/dynamic-subcategories", carId, selectedYear],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const categories: Array<'directDelivery' | 'cogs' | 'parkingFeeLabor' | 'reimbursedBills'> = [
        'directDelivery',
        'cogs',
        'parkingFeeLabor',
        'reimbursedBills',
      ];
      
      const promises = categories.map(async (categoryType) => {
        try {
          const response = await fetch(
            buildApiUrl(`/api/income-expense/dynamic-subcategories/${carId}/${selectedYear}/${categoryType}`),
            { credentials: "include" }
          );
          if (response.ok) {
            const result = await response.json();
            return { categoryType, data: result.data || [] };
          }
          return { categoryType, data: [] };
        } catch (error) {
          console.error(`Error fetching ${categoryType} subcategories:`, error);
          return { categoryType, data: [] };
        }
      });
      
      const results = await Promise.all(promises);
      const subcategories: any = {
        directDelivery: [],
        cogs: [],
        parkingFeeLabor: [],
        reimbursedBills: [],
      };
      
      results.forEach(({ categoryType, data }) => {
        subcategories[categoryType] = data;
      });
      
      return { success: true, data: subcategories };
    },
    enabled: !!carId && !!selectedYear,
    retry: false,
  });

  const dynamicSubcategories = dynamicSubcategoriesData?.data || {
    directDelivery: [],
    cogs: [],
    parkingFeeLabor: [],
    reimbursedBills: [],
  };

  // Get month modes and ski racks owner from income expense data
  const monthModes = incomeExpenseDataValue?.formulaSetting?.monthModes || {};
  const skiRacksOwner = incomeExpenseDataValue?.formulaSetting?.skiRacksOwner || {};

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

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  // Helper functions to calculate totals from income-expense data (same as IncomeExpenseTable)
  // Helper to get total operating expense (Direct Delivery) for a month (including dynamic subcategories)
  const getTotalDirectDeliveryForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(incomeExpenseDataValue?.directDelivery || [], month, "laborCarCleaning") +
      getMonthValue(incomeExpenseDataValue?.directDelivery || [], month, "laborDelivery") +
      getMonthValue(incomeExpenseDataValue?.directDelivery || [], month, "parkingAirport") +
      getMonthValue(incomeExpenseDataValue?.directDelivery || [], month, "parkingLot") +
      getMonthValue(incomeExpenseDataValue?.directDelivery || [], month, "uberLyftLime")
    );
    const dynamicTotal = dynamicSubcategories.directDelivery.reduce((sum, subcat) => {
      const monthValue = subcat.values.find((v: any) => v.month === month);
      return sum + (monthValue?.value || 0);
    }, 0);
    return fixedTotal + dynamicTotal;
  };

  // Helper to get total operating expense (COGS) for a month (including dynamic subcategories)
  const getTotalCogsForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "autoBodyShopWreck") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "alignment") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "battery") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "brakes") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "carPayment") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "carInsurance") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "carSeats") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "cleaningSuppliesTools") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "emissions") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "gpsSystem") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "keyFob") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "laborCleaning") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "licenseRegistration") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "mechanic") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "oilLube") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "parts") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "skiRacks") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "tickets") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "tiredAirStation") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "tires") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "towingImpoundFees") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "uberLyftLime") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "windshield") +
      getMonthValue(incomeExpenseDataValue?.cogs || [], month, "wipers")
    );
    const dynamicTotal = dynamicSubcategories.cogs.reduce((sum, subcat) => {
      const monthValue = subcat.values.find((v: any) => v.month === month);
      return sum + (monthValue?.value || 0);
    }, 0);
    return fixedTotal + dynamicTotal;
  };

  // Helper to get total reimbursed bills for a month (including dynamic subcategories)
  const getTotalReimbursedBillsForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "electricReimbursed") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "electricNotReimbursed") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "gasReimbursed") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "gasNotReimbursed") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "gasServiceRun") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "parkingAirport") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "uberLyftLimeNotReimbursed") +
      getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], month, "uberLyftLimeReimbursed")
    );
    const dynamicTotal = dynamicSubcategories.reimbursedBills.reduce((sum, subcat) => {
      const monthValue = subcat.values.find((v: any) => v.month === month);
      return sum + (monthValue?.value || 0);
    }, 0);
    return fixedTotal + dynamicTotal;
  };

  // Calculate Negative Balance Carry Over (same as IncomeExpenseTable)
  const calculateNegativeBalanceCarryOver = (month: number): number => {
    if (month === 1) {
      // January uses December of previous year
      if (!prevYearDecData) {
        return 0;
      }
      
      // Get December (month 12) data from previous year
      const decRentalIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "rentalIncome");
      const decDeliveryIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "deliveryIncome");
      const decElectricPrepaidIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "electricPrepaidIncome");
      const decSmokingFines = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "smokingFines");
      const decGasPrepaidIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "gasPrepaidIncome");
      const decSkiRacksIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "skiRacksIncome");
      const decMilesIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "milesIncome");
      const decChildSeatIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "childSeatIncome");
      const decCoolersIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "coolersIncome");
      const decInsuranceWreckIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "insuranceWreckIncome");
      const decOtherIncome = getMonthValue(prevYearDecData.incomeExpenses || [], 12, "otherIncome");
      
      // Calculate December's negative balance carry over (recursive call for previous months)
      const calculateDecNegativeBalance = (m: number, prevData: IncomeExpenseData): number => {
        if (m === 1) return 0;
        const prevM = m - 1;
        const prevRentalIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "rentalIncome");
        const prevDeliveryIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "deliveryIncome");
        const prevElectricPrepaidIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "electricPrepaidIncome");
        const prevSmokingFines = getMonthValue(prevData.incomeExpenses || [], prevM, "smokingFines");
        const prevGasPrepaidIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "gasPrepaidIncome");
        const prevSkiRacksIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "skiRacksIncome");
        const prevMilesIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "milesIncome");
        const prevChildSeatIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "childSeatIncome");
        const prevCoolersIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "coolersIncome");
        const prevInsuranceWreckIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "insuranceWreckIncome");
        const prevOtherIncome = getMonthValue(prevData.incomeExpenses || [], prevM, "otherIncome");
        const prevNegativeBalance = prevM === 1 ? 0 : calculateDecNegativeBalance(prevM, prevData);
        
        const prevTotalDirectDelivery = (prevData.directDelivery || []).reduce((sum: number, m: any) => {
          if (m.month === prevM) {
            return sum + (Number(m.laborCarCleaning) || 0) + (Number(m.laborDelivery) || 0) + 
                   (Number(m.parkingAirport) || 0) + (Number(m.parkingLot) || 0) + (Number(m.uberLyftLime) || 0);
          }
          return sum;
        }, 0);
        
        const prevTotalCogs = (prevData.cogs || []).reduce((sum: number, m: any) => {
          if (m.month === prevM) {
            return sum + (Number(m.autoBodyShopWreck) || 0) + (Number(m.alignment) || 0) + 
                   (Number(m.battery) || 0) + (Number(m.brakes) || 0) + (Number(m.carPayment) || 0) +
                   (Number(m.carInsurance) || 0) + (Number(m.carSeats) || 0) + (Number(m.cleaningSuppliesTools) || 0) +
                   (Number(m.emissions) || 0) + (Number(m.gpsSystem) || 0) + (Number(m.keyFob) || 0) +
                   (Number(m.laborCleaning) || 0) + (Number(m.licenseRegistration) || 0) + (Number(m.mechanic) || 0) +
                   (Number(m.oilLube) || 0) + (Number(m.parts) || 0) + (Number(m.skiRacks) || 0) +
                   (Number(m.tickets) || 0) + (Number(m.tiredAirStation) || 0) + (Number(m.tires) || 0) +
                   (Number(m.towingImpoundFees) || 0) + (Number(m.uberLyftLime) || 0) + (Number(m.windshield) || 0) +
                   (Number(m.wipers) || 0);
          }
          return sum;
        }, 0);
        
        const calculation = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - 
                           prevGasPrepaidIncome - prevMilesIncome - prevSkiRacksIncome - 
                           prevChildSeatIncome - prevCoolersIncome - prevInsuranceWreckIncome - 
                           prevOtherIncome - prevTotalDirectDelivery - prevTotalCogs - prevNegativeBalance;
        const result = calculation > 0 ? 0 : calculation;
        return result;
      };
      
      const decNegativeBalanceCarryOver = calculateDecNegativeBalance(12, prevYearDecData);
      
      const decTotalDirectDelivery = (prevYearDecData.directDelivery || []).reduce((sum: number, m: any) => {
        if (m.month === 12) {
          return sum + (Number(m.laborCarCleaning) || 0) + (Number(m.laborDelivery) || 0) + 
                 (Number(m.parkingAirport) || 0) + (Number(m.parkingLot) || 0) + (Number(m.uberLyftLime) || 0);
        }
        return sum;
      }, 0);
      
      const decTotalCogs = (prevYearDecData.cogs || []).reduce((sum: number, m: any) => {
        if (m.month === 12) {
          return sum + (Number(m.autoBodyShopWreck) || 0) + (Number(m.alignment) || 0) + 
                 (Number(m.battery) || 0) + (Number(m.brakes) || 0) + (Number(m.carPayment) || 0) +
                 (Number(m.carInsurance) || 0) + (Number(m.carSeats) || 0) + (Number(m.cleaningSuppliesTools) || 0) +
                 (Number(m.emissions) || 0) + (Number(m.gpsSystem) || 0) + (Number(m.keyFob) || 0) +
                 (Number(m.laborCleaning) || 0) + (Number(m.licenseRegistration) || 0) + (Number(m.mechanic) || 0) +
                 (Number(m.oilLube) || 0) + (Number(m.parts) || 0) + (Number(m.skiRacks) || 0) +
                 (Number(m.tickets) || 0) + (Number(m.tiredAirStation) || 0) + (Number(m.tires) || 0) +
                 (Number(m.towingImpoundFees) || 0) + (Number(m.uberLyftLime) || 0) + (Number(m.windshield) || 0) +
                 (Number(m.wipers) || 0);
        }
        return sum;
      }, 0);
      
      const calculation = decRentalIncome - decDeliveryIncome - decElectricPrepaidIncome - 
                         decGasPrepaidIncome - decMilesIncome - decSkiRacksIncome - 
                         decChildSeatIncome - decCoolersIncome - decInsuranceWreckIncome - 
                         decOtherIncome - decTotalDirectDelivery - decTotalCogs - decNegativeBalanceCarryOver;
      
      const result = calculation > 0 ? 0 : calculation;
      return result;
    }
    
    const prevMonth = month - 1;
    const prevRentalIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "rentalIncome");
    const prevDeliveryIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "deliveryIncome");
    const prevElectricPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "electricPrepaidIncome");
    const prevSmokingFines = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "smokingFines");
    const prevGasPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "gasPrepaidIncome");
    const prevSkiRacksIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "skiRacksIncome");
    const prevMilesIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "milesIncome");
    const prevChildSeatIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "childSeatIncome");
    const prevCoolersIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "coolersIncome");
    const prevInsuranceWreckIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "insuranceWreckIncome");
    const prevOtherIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], prevMonth, "otherIncome");
    const prevNegativeBalanceCarryOver = calculateNegativeBalanceCarryOver(prevMonth);
    const prevTotalDirectDelivery = getTotalDirectDeliveryForMonth(prevMonth);
    const prevTotalCogs = getTotalCogsForMonth(prevMonth);
    
    const calculation = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - 
                       prevGasPrepaidIncome - prevMilesIncome - prevSkiRacksIncome - 
                       prevChildSeatIncome - prevCoolersIncome - prevInsuranceWreckIncome - 
                       prevOtherIncome - prevTotalDirectDelivery - prevTotalCogs - prevNegativeBalanceCarryOver;
    
    const result = calculation > 0 ? 0 : calculation;
    return result;
  };

  // Calculate Car Management Split (same as IncomeExpenseTable)
  const calculateCarManagementSplit = (month: number): number => {
    const storedPercent = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "carManagementSplit") || 0;
    const mgmtPercent = storedPercent / 100;
    
    const rentalIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "rentalIncome");
    const deliveryIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "deliveryIncome");
    const electricPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "electricPrepaidIncome");
    const smokingFines = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "smokingFines");
    const gasPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "gasPrepaidIncome");
    const skiRacksIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "skiRacksIncome");
    const milesIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "milesIncome");
    const childSeatIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "childSeatIncome");
    const coolersIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "coolersIncome");
    const insuranceWreckIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "insuranceWreckIncome");
    const otherIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "otherIncome");
    const negativeBalanceCarryOver = calculateNegativeBalanceCarryOver(month);
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    const totalReimbursedBills = getTotalReimbursedBillsForMonth(month);
    
    // From 2026 onwards, use formulas that include ski racks income
    // Before 2026, ignore ski racks income and always use standard formula
    const year = parseInt(selectedYear, 10);
    const isYear2026OrLater = year >= 2026;
    const useSkiRacksFormula = isYear2026OrLater && skiRacksIncome > 0;
    const use2026NoSkiRacksFormula = isYear2026OrLater && skiRacksIncome === 0;
    
    if (useSkiRacksFormula) {
      const owner = skiRacksOwner[month] || "GLA";
      
      if (owner === "GLA") {
        const part1 = deliveryIncome + electricPrepaidIncome + smokingFines + childSeatIncome + 
                     coolersIncome + insuranceWreckIncome + otherIncome + gasPrepaidIncome + 
                     (skiRacksIncome * 0.9) - totalReimbursedBills;
        const profit = rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * mgmtPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      } else {
        const part1 = deliveryIncome + electricPrepaidIncome + smokingFines + childSeatIncome + 
                     coolersIncome + insuranceWreckIncome + otherIncome + 
                     (skiRacksIncome * 0.9) - totalReimbursedBills;
        const profit = rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * mgmtPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      }
    }
    
    // For year >= 2026 with no ski racks income, use special formula
    if (use2026NoSkiRacksFormula) {
      // Car Management Split for 2026+ with no ski racks income:
      // =MAX(
      //   Delivery Income + Electric Prepaid Income + Gas Prepaid Income + Smoking Fines * 90% - 
      //   TOTAL REIMBURSE AND NON-REIMBURSE BILLS + 
      //   (Rental Income + Negative Balance Carry Over - Delivery Income - Electric Prepaid Income - 
      //    Smoking Fines - Gas Prepaid Income - Miles Income - TOTAL OPERATING EXPENSE (Direct Delivery) - 
      //    TOTAL OPERATING EXPENSE (COGS - Per Vehicle)) * Car Management Split %, 
      //   0
      // )
      const part1 = deliveryIncome + electricPrepaidIncome + gasPrepaidIncome + (smokingFines * 0.9) - totalReimbursedBills;
      const part2 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                    smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * mgmtPercent;
      const calculation = part1 + part2;
      return calculation >= 0 ? calculation : 0;
    }
    
    // Standard formula when year < 2026
    const part1 = deliveryIncome + electricPrepaidIncome + smokingFines + gasPrepaidIncome - totalReimbursedBills;
    const part2 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                   smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * mgmtPercent;
    const calculation = part1 + part2;
    
    return calculation >= 0 ? calculation : 0;
  };

  // Calculate Car Owner Split (same as IncomeExpenseTable)
  const calculateCarOwnerSplit = (month: number): number => {
    const storedPercent = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "carOwnerSplit") || 0;
    const ownerPercent = storedPercent / 100;
    
    const rentalIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "rentalIncome");
    const deliveryIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "deliveryIncome");
    const electricPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "electricPrepaidIncome");
    const smokingFines = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "smokingFines");
    const gasPrepaidIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "gasPrepaidIncome");
    const skiRacksIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "skiRacksIncome");
    const milesIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "milesIncome");
    const childSeatIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "childSeatIncome");
    const coolersIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "coolersIncome");
    const insuranceWreckIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "insuranceWreckIncome");
    const otherIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "otherIncome");
    const negativeBalanceCarryOver = calculateNegativeBalanceCarryOver(month);
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    // From 2026 onwards, use formulas that include ski racks income
    // Before 2026, ignore ski racks income and always use standard formula
    const year = parseInt(selectedYear, 10);
    const isYear2026OrLater = year >= 2026;
    const useSkiRacksFormula = isYear2026OrLater && skiRacksIncome > 0;
    const use2026NoSkiRacksFormula = isYear2026OrLater && skiRacksIncome === 0;
    
    if (useSkiRacksFormula) {
      const owner = skiRacksOwner[month] || "GLA";
      
      if (owner === "GLA") {
        const part1 = milesIncome + (skiRacksIncome * 0.1);
        const profit = rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * ownerPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      } else {
        const part1 = milesIncome + gasPrepaidIncome + (skiRacksIncome * 0.1);
        const profit = rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * ownerPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      }
    }
    
    // For year >= 2026 with no ski racks income, use special formula
    if (use2026NoSkiRacksFormula) {
      // Car Owner Split for 2026+ with no ski racks income:
      // =MAX(
      //   Miles Income + Smoking Fines * 10% +
      //   (Rental Income + Negative Balance Carry Over - Delivery Income - Electric Prepaid Income - 
      //    Smoking Fines - Gas Prepaid Income - Miles Income - TOTAL OPERATING EXPENSE (Direct Delivery) - 
      //    TOTAL OPERATING EXPENSE (COGS - Per Vehicle)) * Car Owner Split %, 
      //   0
      // )
      const part1 = milesIncome + (smokingFines * 0.1);
      const part2 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                    smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * ownerPercent;
      const calculation = part1 + part2;
      return calculation >= 0 ? calculation : 0;
    }
    
    // Standard formula when year < 2026
    const part1 = milesIncome;
    const part2 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                   smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * ownerPercent;
    const calculation = part1 + part2;
    
    return calculation >= 0 ? calculation : 0;
  };

  // Calculate Car Management Total Expenses (same as IncomeExpenseTable)
  const calculateCarManagementTotalExpenses = (month: number): number => {
    const storedMgmtPercent = Number(getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "carManagementSplit")) || 0;
    const mgmtPercent = storedMgmtPercent / 100;
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    const totalReimbursedBills = getTotalReimbursedBillsForMonth(month);
    
    return totalReimbursedBills + (totalDirectDelivery * mgmtPercent) + (totalCogs * mgmtPercent);
  };

  // Calculate Car Owner Total Expenses (same as IncomeExpenseTable)
  const calculateCarOwnerTotalExpenses = (month: number): number => {
    const storedOwnerPercent = Number(getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], month, "carOwnerSplit")) || 0;
    const ownerPercent = storedOwnerPercent / 100;
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    return (totalDirectDelivery * ownerPercent) + (totalCogs * ownerPercent);
  };

  // Fetch Turo earnings chart images
  const { data: chartImagesData, refetch: refetchChartImages } = useQuery<{
    success: boolean;
    data: { [month: number]: string };
  }>({
    queryKey: ["/api/earnings/charts", carId, selectedYear],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const response = await fetch(
        buildApiUrl(`/api/earnings/charts/${carId}/${selectedYear}`),
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, data: {} };
        }
        throw new Error("Failed to fetch chart images");
      }
      return response.json();
    },
    enabled: !!carId && !!selectedYear,
    retry: false,
  });

  const chartImages = chartImagesData?.data || {};

  // Handle chart image upload
  const handleChartUpload = async (month: number, file: File) => {
    if (!carId) return;

    setUploadingChart((prev) => ({ ...prev, [month]: true }));
    try {
      const formData = new FormData();
      formData.append("chart", file);
      formData.append("month", month.toString());
      formData.append("year", selectedYear);

      const response = await fetch(buildApiUrl(`/api/earnings/charts/${carId}`), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload chart");
      }

      const result = await response.json();
      
      // Refresh chart images
      await refetchChartImages();
      
      toast({
        title: "Success",
        description: result.message || "Chart uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload chart",
        variant: "destructive",
      });
    } finally {
      setUploadingChart((prev) => ({ ...prev, [month]: false }));
    }
  };

  // Handle chart image delete
  const handleChartDelete = async (month: number) => {
    if (!carId) return;

    if (!confirm(`Are you sure you want to delete the chart for ${MONTHS[month - 1]}?`)) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/api/earnings/charts/${carId}/${selectedYear}/${month}`),
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete chart");
      }

      // Refresh chart images
      await refetchChartImages();
      
      toast({
        title: "Success",
        description: "Chart deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete chart",
        variant: "destructive",
      });
    }
  };

  if (isCarLoading || isIncomeExpenseLoading) {
    return (
      <AdminLayout>
        <CarDetailSkeleton />
      </AdminLayout>
    );
  }

  if (carError || !car) {
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
                <col style={{ width: '25%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5.5%' }} />)}
                <col style={{ width: '7%' }} />
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Category / Expense
                  </th>
                  {months.map((month, index) => {
                    const monthNum = index + 1;
                    const year = parseInt(selectedYear, 10);
                    const showSkiRacksToggle = year >= 2026;
                    const currentMode = monthModes[monthNum] || 50;
                    const currentSkiRacksOwner = skiRacksOwner[monthNum] || "GLA";
                    const hasSkiRacksIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], monthNum, "skiRacksIncome") > 0;
                    
                    return (
                      <th
                        key={month}
                        className="border-l border-[#2a2a2a] px-2 py-2 text-center min-w-[100px] sticky top-0 bg-[#1a1a1a] z-30"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-white text-xs">{month}</span>
                          <div className="flex items-center gap-1">
                            {/* Rate Mode Toggle (Read-only) */}
                            <div
                              className={cn(
                                "px-3 py-0.5 rounded-full text-xs font-semibold transition-all duration-200",
                                currentMode === 50 
                                  ? "bg-green-600 text-white" 
                                  : "bg-blue-600 text-white"
                              )}
                              title={`Split mode: ${currentMode === 50 ? "50:50 (green)" : "30:70 (blue)"}`}
                            >
                              {currentMode}
                            </div>
                            {/* Ski Racks Owner Toggle (Read-only) - Only show for years >= 2026 */}
                            {showSkiRacksToggle && (
                              <div
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 min-w-[24px]",
                                  !hasSkiRacksIncome 
                                    ? "bg-gray-600 text-gray-400"
                                    : currentSkiRacksOwner === "GLA"
                                      ? "bg-purple-600 text-white"
                                      : "bg-orange-600 text-white"
                                )}
                                title={
                                  !hasSkiRacksIncome
                                    ? "No ski racks income"
                                    : `Ski racks owner: ${currentSkiRacksOwner === "GLA" ? "Management/GLA (purple)" : "Owner (orange)"}`
                                }
                              >
                                {currentSkiRacksOwner === "GLA" ? "M" : "O"}
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1f1f1f] z-30 border-l border-[#2a2a2a] whitespace-nowrap">
                    Total
                    </th>
                </tr>
              </thead>
              <tbody className="relative">
                {/* CAR MANAGEMENT OWNER SPLIT */}
                <CategorySection
                  title="CAR MANAGEMENT OWNER SPLIT"
                  isExpanded={expandedSections.managementOwner}
                  onToggle={() => toggleSection("managementOwner")}
                >
                  <TableRow
                    label="Car Management Split"
                    values={MONTHS.map((_, i) => calculateCarManagementSplit(i + 1))}
                  />
                  <TableRow
                    label="Car Owner Split"
                    values={MONTHS.map((_, i) => calculateCarOwnerSplit(i + 1))}
                  />
                </CategorySection>

                {/* INCOME AND EXPENSES */}
                <CategorySection
                  title="INCOME AND EXPENSES"
                  isExpanded={expandedSections.incomeExpenses}
                  onToggle={() => toggleSection("incomeExpenses")}
                >
                  <TableRow
                    label="Rental Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "rentalIncome"))}
                  />
                  <TableRow
                    label="Delivery Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "deliveryIncome"))}
                  />
                  <TableRow
                    label="Electric Prepaid Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "electricPrepaidIncome"))}
                  />
                  <TableRow
                    label="Smoking Fines"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "smokingFines"))}
                  />
                  <TableRow
                    label="Gas Prepaid Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "gasPrepaidIncome"))}
                  />
                  <TableRow
                    label="Ski Racks Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "skiRacksIncome"))}
                  />
                  <TableRow
                    label="Miles Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "milesIncome"))}
                  />
                  <TableRow
                    label="Child Seat Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "childSeatIncome"))}
                  />
                  <TableRow
                    label="Coolers Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "coolersIncome"))}
                  />
                  <TableRow
                    label="Income Insurance and Client Wrecks"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "insuranceWreckIncome"))}
                  />
                  <TableRow
                    label="Other Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "otherIncome"))}
                  />
                </CategorySection>

                {/* HISTORY */}
                <CategorySection
                  title="HISTORY"
                  isExpanded={expandedSections.history}
                  onToggle={() => toggleSection("history")}
                >
                  <TableRow
                    label="Days Rented"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.history || [], i + 1, "daysRented"))}
                    isInteger
                  />
                  {isAdmin && (
                    <TableRow
                      label="Cars Available For Rent"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.history || [], i + 1, "carsAvailableForRent"))}
                      isInteger
                    />
                  )}
                  <TableRow
                    label="Trips Taken"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.history || [], i + 1, "tripsTaken"))}
                    isInteger
                  />
                </CategorySection>

                {/* CAR RENTAL VALUE PER MONTH */}
                <CategorySection
                  title="CAR RENTAL VALUE PER MONTH"
                  isExpanded={expandedSections.rentalValue}
                  onToggle={() => toggleSection("rentalValue")}
                >
                  <TableRow
                    label="Total Car Rental Income"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], i + 1, "rentalIncome"))}
                  />
                  <TableRow
                    label="Trips Taken"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.history || [], i + 1, "tripsTaken"))}
                    isInteger
                  />
                  <TableRow
                    label="Ave Per Rental Per Trips Taken"
                    values={MONTHS.map((_, i) => {
                      const monthNum = i + 1;
                      const rental = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], monthNum, "rentalIncome");
                      const trips = getMonthValue(incomeExpenseDataValue?.history || [], monthNum, "tripsTaken");
                      return trips > 0 ? rental / trips : 0;
                    })}
                  />
                </CategorySection>

                {/* OPERATING EXPENSE (Direct Delivery) */}
                <CategorySection
                  title="OPERATING EXPENSE (DIRECT DELIVERY)"
                  isExpanded={expandedSections.directDelivery}
                  onToggle={() => toggleSection("directDelivery")}
                >
                  <TableRow
                    label="Labor - Detailing"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.directDelivery || [], i + 1, "laborCarCleaning"))}
                  />
                  <TableRow
                    label="Labor - Delivery"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.directDelivery || [], i + 1, "laborDelivery"))}
                  />
                  <TableRow
                    label="Parking - Airport"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.directDelivery || [], i + 1, "parkingAirport"))}
                  />
                  <TableRow
                    label="Parking - Lot"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.directDelivery || [], i + 1, "parkingLot"))}
                  />
                  <TableRow
                    label="Uber/Lyft/Lime"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.directDelivery || [], i + 1, "uberLyftLime"))}
                  />
                  <TableRow
                    label="TOTAL OPERATING EXPENSE (Direct Delivery)"
                    values={MONTHS.map((_, i) => getTotalDirectDeliveryForMonth(i + 1))}
                    isTotal
                  />
                </CategorySection>

                {/* OPERATING EXPENSE (COGS - Per Vehicle) */}
                <CategorySection
                  title="OPERATING EXPENSE (COGS - PER VEHICLE)"
                  isExpanded={expandedSections.cogs}
                  onToggle={() => toggleSection("cogs")}
                >
                  <TableRow
                    label="Auto Body Shop / Wreck"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "autoBodyShopWreck"))}
                  />
                  <TableRow
                    label="Alignment"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "alignment"))}
                  />
                  <TableRow
                    label="Battery"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "battery"))}
                  />
                  <TableRow
                    label="Brakes"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "brakes"))}
                  />
                  <TableRow
                    label="Car Payment"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "carPayment"))}
                  />
                  <TableRow
                    label="Car Insurance"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "carInsurance"))}
                  />
                  <TableRow
                    label="Car Seats"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "carSeats"))}
                  />
                  <TableRow
                    label="Cleaning Supplies / Tools"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "cleaningSuppliesTools"))}
                  />
                  <TableRow
                    label="Emissions"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "emissions"))}
                  />
                  <TableRow
                    label="GPS System"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "gpsSystem"))}
                  />
                  <TableRow
                    label="Key & Fob"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "keyFob"))}
                  />
                  <TableRow
                    label="Labor - Detailing"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "laborCleaning"))}
                  />
                  <TableRow
                    label="License & Registration"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "licenseRegistration"))}
                  />
                  <TableRow
                    label="Mechanic"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "mechanic"))}
                  />
                  <TableRow
                    label="Oil/Lube"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "oilLube"))}
                  />
                  <TableRow
                    label="Parts"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "parts"))}
                  />
                  <TableRow
                    label="Ski Racks"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "skiRacks"))}
                  />
                  <TableRow
                    label="Tickets & Tolls"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "tickets"))}
                  />
                  <TableRow
                    label="Tired Air Station"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "tiredAirStation"))}
                  />
                  <TableRow
                    label="Tires"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "tires"))}
                  />
                  <TableRow
                    label="Towing / Impound Fees"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "towingImpoundFees"))}
                  />
                  <TableRow
                    label="Uber/Lyft/Lime"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "uberLyftLime"))}
                  />
                  <TableRow
                    label="Windshield"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "windshield"))}
                  />
                  <TableRow
                    label="Wipers"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.cogs || [], i + 1, "wipers"))}
                  />
                  <TableRow
                    label="TOTAL OPERATING EXPENSE (COGS - Per Vehicle)"
                    values={MONTHS.map((_, i) => getTotalCogsForMonth(i + 1))}
                    isTotal
                  />
                </CategorySection>

                {/* GLA PARKING FEE & LABOR CLEANING */}
                <CategorySection
                  title="GLA PARKING FEE & LABOR CLEANING"
                  isExpanded={expandedSections.parkingFeeLabor}
                  onToggle={() => toggleSection("parkingFeeLabor")}
                >
                  <TableRow
                    label="GLA Parking Fee"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.parkingFeeLabor || [], i + 1, "glaParkingFee"))}
                  />
                  <TableRow
                    label="Labor - Detailing"
                    values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.parkingFeeLabor || [], i + 1, "laborCleaning"))}
                  />
                </CategorySection>

                {/* REIMBURSED AND NON-REIMBURSED BILLS - Only visible to admin */}
                {isAdmin && (
                  <CategorySection
                    title="REIMBURSED AND NON-REIMBURSED BILLS"
                    isExpanded={expandedSections.reimbursedBills}
                    onToggle={() => toggleSection("reimbursedBills")}
                  >
                    <TableRow
                      label="Electric - Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "electricReimbursed"))}
                    />
                    <TableRow
                      label="Electric - Not Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "electricNotReimbursed"))}
                    />
                    <TableRow
                      label="Gas - Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "gasReimbursed"))}
                    />
                    <TableRow
                      label="Gas - Not Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "gasNotReimbursed"))}
                    />
                    <TableRow
                      label="Gas - Service Run"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "gasServiceRun"))}
                    />
                    <TableRow
                      label="Parking Airport"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "parkingAirport"))}
                    />
                    <TableRow
                      label="Uber/Lyft/Lime - Not Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "uberLyftLimeNotReimbursed"))}
                    />
                    <TableRow
                      label="Uber/Lyft/Lime - Reimbursed"
                      values={MONTHS.map((_, i) => getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], i + 1, "uberLyftLimeReimbursed"))}
                    />
                    <TableRow
                      label="TOTAL REIMBURSED AND NON-REIMBURSED BILLS"
                      values={MONTHS.map((_, i) => getTotalReimbursedBillsForMonth(i + 1))}
                      isTotal
                    />
                  </CategorySection>
                )}
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
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {months.map((monthLabel, index) => {
                const monthNum = index + 1;
                const rentalIncome = getMonthValue(incomeExpenseDataValue?.incomeExpenses || [], monthNum, "rentalIncome");
                const chartImageUrl = chartImages[monthNum];
                const isUploading = uploadingChart[monthNum];
                
                // Calculate chart data for auto-generation
                // Note: When AI extraction is ready, add "Upcoming Earnings" and "Missed Earnings" fields here
                const reimbursedAmount = (
                  getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], monthNum, "electricReimbursed") +
                  getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], monthNum, "gasReimbursed") +
                  getMonthValue(incomeExpenseDataValue?.reimbursedBills || [], monthNum, "uberLyftLimeReimbursed")
                );
                
                // TODO: Add these when AI extraction provides the data:
                // - upcomingEarnings: from AI-extracted data
                // - missedEarnings: from AI-extracted data
                const upcomingEarnings = 0; // Placeholder - will be populated from AI extraction
                const missedEarnings = 0; // Placeholder - will be populated from AI extraction
                
                const chartData = [
                  {
                    name: "Turo Earnings",
                    value: rentalIncome,
                  },
                  {
                    name: "Reimbursements",
                    value: reimbursedAmount,
                  },
                  ...(upcomingEarnings > 0 ? [{
                    name: "Upcoming Earnings",
                    value: upcomingEarnings,
                  }] : []),
                  ...(missedEarnings > 0 ? [{
                    name: "Missed Earnings",
                    value: missedEarnings,
                  }] : []),
                ];

                return (
                <div key={index} className="flex flex-col">
                    {/* Month Label with Rental Income */}
                  <div className="bg-[#EAEB80] text-black px-3 py-2 text-sm font-medium rounded-t flex justify-between items-center">
                      <span>{monthLabel}</span>
                      <span className="font-semibold">{formatCurrency(rentalIncome)}</span>
                  </div>
                    
                    {/* Chart Image Area */}
                    <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-b relative group min-h-[200px] flex items-center justify-center">
                      {chartImageUrl ? (
                        <>
                          {/* Manual Upload Override - Show uploaded image */}
                          <img
                            src={chartImageUrl}
                            alt={`Turo Earnings Chart - ${monthLabel}`}
                            className="w-full h-auto max-h-[300px] object-contain"
                          />
                          {/* Delete button on hover */}
                          {isAdmin && (
                            <button
                              onClick={() => handleChartDelete(monthNum)}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Delete chart (will show auto-generated chart)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {/* Upload overlay for replacing manual upload */}
                          {chartImageUrl && isAdmin && (
                            <label className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-b">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleChartUpload(monthNum, file);
                                  }
                                  e.target.value = "";
                                }}
                                disabled={isUploading}
                              />
                              <div className="flex items-center gap-2 px-4 py-2 bg-[#EAEB80] text-black rounded hover:bg-[#d4d570] transition-colors">
                                {isUploading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4" />
                                    <span className="text-sm">Replace Chart</span>
                                  </>
                                )}
                  </div>
                            </label>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Auto-Generated Chart */}
                          <div className="w-full h-full p-4">
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart 
                                data={chartData}
                                margin={{ top: 5, right: 5, left: 5, bottom: 40 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                <XAxis 
                                  dataKey="name" 
                                  stroke="#9ca3af"
                                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis 
                                  stroke="#9ca3af"
                                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#1a1a1a', 
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '4px',
                                    color: '#fff'
                                  }}
                                  formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar 
                                  dataKey="value"
                                  radius={[4, 4, 0, 0]}
                                  fill="#EAEB80"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                </div>
                          
                          {/* Upload button overlay for auto-generated chart */}
                          {isAdmin && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-b">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleChartUpload(monthNum, file);
                                    }
                                    e.target.value = "";
                                  }}
                                  disabled={isUploading}
                                />
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#EAEB80] text-black rounded hover:bg-[#d4d570] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-sm">Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      <span className="text-sm">Upload Custom Chart</span>
                                    </>
                                  )}
            </div>
                              </label>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Graphs and Charts Report Section (moved from Graphs and Charts Report page) */}
        <GraphsChartsReportSection
          className="mb-6"
          incomeExpenseData={incomeExpenseDataValue}
          selectedYear={selectedYear}
          calculateCarManagementSplit={calculateCarManagementSplit}
          calculateCarOwnerSplit={calculateCarOwnerSplit}
          calculateCarManagementTotalExpenses={calculateCarManagementTotalExpenses}
          calculateCarOwnerTotalExpenses={calculateCarOwnerTotalExpenses}
          getMonthValue={getMonthValue}
        />
      </div>
    </AdminLayout>
  );
}

// Helper Components
interface CategorySectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CategorySection({ title, isExpanded, onToggle, children }: CategorySectionProps) {
  return (
    <>
      <tr className="bg-[#1a1a1a] hover:bg-[#222]">
        <td colSpan={14} className="sticky left-0 z-30 bg-[#1a1a1a] hover:bg-[#222] px-3 py-2 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#EAEB80]" /> : <ChevronRight className="w-4 h-4 text-[#EAEB80]" />}
            <span className="text-sm font-semibold text-[#EAEB80]">{title}</span>
          </div>
        </td>
      </tr>
      {isExpanded && children}
    </>
  );
}

interface TableRowProps {
  label: string;
  values: number[];
  isInteger?: boolean;
  isTotal?: boolean;
}

function TableRow({ label, values, isInteger = false, isTotal = false }: TableRowProps) {
  const total = calculateTotal(values);
  // For Negative Balance Carry Over, display absolute value (remove minus sign)
  const isNegativeBalance = label === "Negative Balance Carry Over";
  
  return (
    <tr className={cn(
      "border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors",
      isTotal && "bg-[#0a0a0a] font-semibold"
    )}>
      <td className={cn(
        "px-3 py-2 text-sm sticky left-0 z-[50] border-r border-[#2a2a2a]",
        isTotal ? "text-[#EAEB80] bg-[#0a0a0a]" : "text-gray-300 bg-[#0f0f0f]"
      )}>
        <span className="whitespace-nowrap">{label}</span>
      </td>
      {values.map((value, i) => {
        const cellValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        // For Negative Balance Carry Over, display absolute value
        const displayValue = isNegativeBalance ? Math.abs(cellValue) : cellValue;
        return (
          <td
            key={i}
            className={cn(
              "text-right px-2 py-2 text-sm border-l border-[#2a2a2a]",
              cellValue !== 0
                ? isTotal ? "text-[#EAEB80] font-semibold" : "text-gray-300 font-medium"
                : "text-gray-500"
            )}
          >
            {isInteger ? cellValue.toString() : formatCurrency(displayValue)}
          </td>
        );
      })}
      <td className={cn(
        "text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f] sticky right-0 z-20",
        isTotal ? "text-[#EAEB80]" : total !== 0 ? "text-gray-300" : "text-gray-400"
      )}>
        {isInteger ? total.toString() : formatCurrency(isNegativeBalance ? Math.abs(total) : total)}
      </td>
    </tr>
  );
}
