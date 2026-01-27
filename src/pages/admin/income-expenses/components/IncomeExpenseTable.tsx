import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useIncomeExpense } from "../context/IncomeExpenseContext";
import EditableCell from "./EditableCell";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import type { IncomeExpenseData } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

interface IncomeExpenseTableProps {
  year: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function IncomeExpenseTable({ year }: IncomeExpenseTableProps) {
  const [location] = useLocation();
  const isReadOnly = location.startsWith("/admin/income-expenses");
  
  const {
    data,
    monthModes,
    toggleMonthMode,
    isSavingMode,
    skiRacksOwner,
    toggleSkiRacksOwner,
    isSavingSkiRacksOwner,
    dynamicSubcategories,
    addDynamicSubcategory,
    updateDynamicSubcategoryName,
    deleteDynamicSubcategory,
    updateDynamicSubcategoryValue,
    carId,
  } = useIncomeExpense();

  // Fetch previous year December data for January calculation
  const previousYear = String(parseInt(year) - 1);
  const { data: previousYearData } = useQuery<{
    success: boolean;
    data: IncomeExpenseData;
  }>({
    queryKey: ["/api/income-expense", carId, previousYear],
    queryFn: async () => {
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
    enabled: !!carId && !!year, // Only fetch if we have carId and year
  });

  const prevYearDecData = previousYearData?.data;
  
  const [addSubcategoryModal, setAddSubcategoryModal] = useState<{
    open: boolean;
    categoryType: string;
    name: string;
  }>({ open: false, categoryType: "", name: "" });
  
  const [editSubcategoryModal, setEditSubcategoryModal] = useState<{
    open: boolean;
    categoryType: string;
    metadataId: number;
    currentName: string;
    newName: string;
  }>({ open: false, categoryType: "", metadataId: 0, currentName: "", newName: "" });

  const [expandedSections, setExpandedSections] = useState({
    managementOwner: true,
    incomeExpenses: true,
    directDelivery: true,
    cogs: true,
    parkingFeeLabor: true,
    reimbursedBills: true,
    history: true,
    rentalValue: true,
    parkingAverageGLA: false,
    parkingAverageQB: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  // Helper to get value by month - checks if data exists and returns actual value or 0
  const getMonthValue = (arr: any[], month: number, field: string): number => {
    if (!arr || !Array.isArray(arr)) return 0;
    const item = arr.find((x) => x && x.month === month);
    if (!item) return 0;
    const value = item[field];
    // Check if value exists (not null, not undefined)
    if (value === null || value === undefined) return 0;
    const numValue = Number(value);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Helper function to calculate total income for a month (sum all income items)
  // This is reactive to data.incomeExpenses changes - recalculates on every render
  // when income data is updated (via React Query invalidation after saves)
  const getTotalIncomeForMonth = (month: number): number => {
    return (
      getMonthValue(data.incomeExpenses, month, "rentalIncome") +
      getMonthValue(data.incomeExpenses, month, "deliveryIncome") +
      getMonthValue(data.incomeExpenses, month, "electricPrepaidIncome") +
      getMonthValue(data.incomeExpenses, month, "smokingFines") +
      getMonthValue(data.incomeExpenses, month, "gasPrepaidIncome") +
      getMonthValue(data.incomeExpenses, month, "skiRacksIncome") +
      getMonthValue(data.incomeExpenses, month, "milesIncome") +
      getMonthValue(data.incomeExpenses, month, "childSeatIncome") +
      getMonthValue(data.incomeExpenses, month, "coolersIncome") +
      getMonthValue(data.incomeExpenses, month, "insuranceWreckIncome") +
      getMonthValue(data.incomeExpenses, month, "otherIncome")
    );
  };

  // Helper to get total operating expense (Direct Delivery) for a month (including dynamic subcategories)
  const getTotalDirectDeliveryForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(data.directDelivery, month, "laborCarCleaning") +
      getMonthValue(data.directDelivery, month, "laborDelivery") +
      getMonthValue(data.directDelivery, month, "parkingAirport") +
      getMonthValue(data.directDelivery, month, "parkingLot") +
      getMonthValue(data.directDelivery, month, "uberLyftLime")
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
      getMonthValue(data.cogs, month, "autoBodyShopWreck") +
      getMonthValue(data.cogs, month, "alignment") +
      getMonthValue(data.cogs, month, "battery") +
      getMonthValue(data.cogs, month, "brakes") +
      getMonthValue(data.cogs, month, "carPayment") +
      getMonthValue(data.cogs, month, "carInsurance") +
      getMonthValue(data.cogs, month, "carSeats") +
      getMonthValue(data.cogs, month, "cleaningSuppliesTools") +
      getMonthValue(data.cogs, month, "emissions") +
      getMonthValue(data.cogs, month, "gpsSystem") +
      getMonthValue(data.cogs, month, "keyFob") +
      getMonthValue(data.cogs, month, "laborCleaning") +
      getMonthValue(data.cogs, month, "licenseRegistration") +
      getMonthValue(data.cogs, month, "mechanic") +
      getMonthValue(data.cogs, month, "oilLube") +
      getMonthValue(data.cogs, month, "parts") +
      getMonthValue(data.cogs, month, "skiRacks") +
      getMonthValue(data.cogs, month, "tickets") +
      getMonthValue(data.cogs, month, "tiredAirStation") +
      getMonthValue(data.cogs, month, "tires") +
      getMonthValue(data.cogs, month, "towingImpoundFees") +
      getMonthValue(data.cogs, month, "uberLyftLime") +
      getMonthValue(data.cogs, month, "windshield") +
      getMonthValue(data.cogs, month, "wipers")
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
      getMonthValue(data.reimbursedBills, month, "electricReimbursed") +
      getMonthValue(data.reimbursedBills, month, "electricNotReimbursed") +
      getMonthValue(data.reimbursedBills, month, "gasReimbursed") +
      getMonthValue(data.reimbursedBills, month, "gasNotReimbursed") +
      getMonthValue(data.reimbursedBills, month, "gasServiceRun") +
      getMonthValue(data.reimbursedBills, month, "parkingAirport") +
      getMonthValue(data.reimbursedBills, month, "uberLyftLimeNotReimbursed") +
      getMonthValue(data.reimbursedBills, month, "uberLyftLimeReimbursed")
    );
    const dynamicTotal = dynamicSubcategories.reimbursedBills.reduce((sum, subcat) => {
      const monthValue = subcat.values.find((v: any) => v.month === month);
      return sum + (monthValue?.value || 0);
    }, 0);
    return fixedTotal + dynamicTotal;
  };

  // Helper to get total parking fee & labor cleaning for a month (including dynamic subcategories)
  const getTotalParkingFeeLaborForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(data.parkingFeeLabor, month, "glaParkingFee") +
      getMonthValue(data.parkingFeeLabor, month, "laborCleaning")
    );
    const dynamicTotal = dynamicSubcategories.parkingFeeLabor.reduce((sum, subcat) => {
      const monthValue = subcat.values.find((v: any) => v.month === month);
      return sum + (monthValue?.value || 0);
    }, 0);
    return fixedTotal + dynamicTotal;
  };

  // Helper to get value from previous year data by month
  const getPrevYearValue = (arr: any[], month: number, field: string): number => {
    if (!arr || !Array.isArray(arr)) return 0;
    const item = arr.find((x) => x && x.month === month);
    return item && typeof item[field] === 'number' ? item[field] : 0;
  };

  // Helper to get total from previous year for Direct Delivery by month
  const getPrevYearTotalDirectDelivery = (month: number): number => {
    if (!prevYearDecData) return 0;
    const data = prevYearDecData;
    return (
      getPrevYearValue(data.directDelivery || [], month, "laborCarCleaning") +
      getPrevYearValue(data.directDelivery || [], month, "laborDelivery") +
      getPrevYearValue(data.directDelivery || [], month, "parkingAirport") +
      getPrevYearValue(data.directDelivery || [], month, "parkingLot") +
      getPrevYearValue(data.directDelivery || [], month, "uberLyftLime")
    );
  };

  // Helper to get total from previous year for COGS by month
  const getPrevYearTotalCogs = (month: number): number => {
    if (!prevYearDecData) return 0;
    const data = prevYearDecData;
    return (
      getPrevYearValue(data.cogs || [], month, "autoBodyShopWreck") +
      getPrevYearValue(data.cogs || [], month, "alignment") +
      getPrevYearValue(data.cogs || [], month, "battery") +
      getPrevYearValue(data.cogs || [], month, "brakes") +
      getPrevYearValue(data.cogs || [], month, "carPayment") +
      getPrevYearValue(data.cogs || [], month, "carInsurance") +
      getPrevYearValue(data.cogs || [], month, "carSeats") +
      getPrevYearValue(data.cogs || [], month, "cleaningSuppliesTools") +
      getPrevYearValue(data.cogs || [], month, "emissions") +
      getPrevYearValue(data.cogs || [], month, "gpsSystem") +
      getPrevYearValue(data.cogs || [], month, "keyFob") +
      getPrevYearValue(data.cogs || [], month, "laborCleaning") +
      getPrevYearValue(data.cogs || [], month, "licenseRegistration") +
      getPrevYearValue(data.cogs || [], month, "mechanic") +
      getPrevYearValue(data.cogs || [], month, "oilLube") +
      getPrevYearValue(data.cogs || [], month, "parts") +
      getPrevYearValue(data.cogs || [], month, "skiRacks") +
      getPrevYearValue(data.cogs || [], month, "tickets") +
      getPrevYearValue(data.cogs || [], month, "tiredAirStation") +
      getPrevYearValue(data.cogs || [], month, "tires") +
      getPrevYearValue(data.cogs || [], month, "towingImpoundFees") +
      getPrevYearValue(data.cogs || [], month, "uberLyftLime") +
      getPrevYearValue(data.cogs || [], month, "windshield") +
      getPrevYearValue(data.cogs || [], month, "wipers")
    );
  };

  // Calculate negative balance carry over for previous year (recursive)
  // Uses the same formulas as calculateNegativeBalanceCarryOver but for previous year data
  const calculatePrevYearNegativeBalance = (month: number, prevYearMode?: 50 | 70): number => {
    if (!prevYearDecData) return 0;
    
    const prevYear = parseInt(year, 10) - 1;
    
    // Year 2019: Always 0
    if (prevYear === 2019) {
      return 0;
    }
    
    // January of other years (2020+): Use 0 (would need another level of recursion)
    if (month === 1 && prevYear > 2019) {
      return 0;
    }
    
    // For months 2-12, calculate from previous month
    const prevMonth = month - 1;
    const prevRentalIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "rentalIncome");
    const prevDeliveryIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "deliveryIncome");
    const prevElectricPrepaidIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "electricPrepaidIncome");
    const prevSmokingFines = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "smokingFines");
    const prevGasPrepaidIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "gasPrepaidIncome");
    const prevSkiRacksIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "skiRacksIncome");
    const prevMilesIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "milesIncome");
    const prevChildSeatIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "childSeatIncome");
    const prevCoolersIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "coolersIncome");
    const prevInsuranceWreckIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "insuranceWreckIncome");
    const prevOtherIncome = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "otherIncome");
    const prevNegativeBalanceCarryOver = calculatePrevYearNegativeBalance(prevMonth, prevYearMode);
    const prevTotalDirectDelivery = getPrevYearTotalDirectDelivery(prevMonth);
    const prevTotalCogs = getPrevYearTotalCogs(prevMonth);
    
    // Get car owner split percentage from previous year data
    const prevCarOwnerSplitPercent = getPrevYearValue(prevYearDecData.incomeExpenses || [], prevMonth, "carOwnerSplit") || 0;
    const prevCarOwnerSplitDecimal = prevCarOwnerSplitPercent / 100;
    
    // Determine mode: if prevYearMode is provided, use it; otherwise default to 50 (50:50)
    const mode = prevYearMode || 50;
    
    let calculation: number;
    
    if (mode === 70) {
      // 30:70 Mode Formula
      // =IF(
      //   (Miles Income + (Smoking Fines*10%)) - TOTAL OPERATING EXPENSE (Direct Delivery) 
      //   - TOTAL OPERATING EXPENSE (COGS - Per Vehicle) - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
      //   + Negative Balance Carry Over
      //   + (Rental Income - Delivery Income - Electric Prepaid Income - Smoking Fines - Gas Prepaid Income 
      //      - Miles Income - Ski Racks Income - Child Seat Income - Coolers Income - Insurance Wreck Income - Other Income)
      //   * Car Owner Split% <=0,
      //   [return calculation],
      //   0
      // )
      const part1 = prevMilesIncome + (prevSmokingFines * 0.1);
      const part2 = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - prevSmokingFines 
                   - prevGasPrepaidIncome - prevMilesIncome - prevSkiRacksIncome - prevChildSeatIncome 
                   - prevCoolersIncome - prevInsuranceWreckIncome - prevOtherIncome;
      calculation = part1 - prevTotalDirectDelivery - prevTotalCogs - prevTotalCogs 
                   + prevNegativeBalanceCarryOver + (part2 * prevCarOwnerSplitDecimal);
      
      // If calculation <= 0, return calculation; otherwise return 0
      return calculation <= 0 ? calculation : 0;
    } else {
      // 50:50 Mode Formula
      // =IF(
      //   Rental Income - Delivery Income - Electric Prepaid Income - Gas Prepaid Income - Smoking Fines
      //   - Miles Income - Ski Racks Income - Child Seat Income - Coolers Income - Insurance Wreck Income - Other Income
      //   - TOTAL OPERATING EXPENSE (Direct Delivery) - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
      //   + Negative Balance Carry Over > 0,
      //   0,
      //   [return calculation]
      // )
      calculation = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - prevGasPrepaidIncome 
                   - prevSmokingFines - prevMilesIncome - prevSkiRacksIncome - prevChildSeatIncome 
                   - prevCoolersIncome - prevInsuranceWreckIncome - prevOtherIncome 
                   - prevTotalDirectDelivery - prevTotalCogs + prevNegativeBalanceCarryOver;
      
      // If calculation > 0, return 0; otherwise return calculation
      return calculation > 0 ? 0 : calculation;
    }
  };

  // Calculate Negative Balance Carry Over:
  // Uses different formulas based on mode (30:70 or 50:50)
  // Year 2019: Always 0
  // January of other years (2020+): Uses December of previous year
  // All other months: Uses previous month
  const calculateNegativeBalanceCarryOver = (month: number): number => {
    const currentYear = parseInt(year, 10);
    
    // Year 2019: Always 0
    if (currentYear === 2019) {
      return 0;
    }
    
    // Get the mode for the previous month (or December of previous year for January)
    let prevMonthMode: 50 | 70 = 50;
    let prevRentalIncome: number;
    let prevDeliveryIncome: number;
    let prevElectricPrepaidIncome: number;
    let prevSmokingFines: number;
    let prevGasPrepaidIncome: number;
    let prevSkiRacksIncome: number;
    let prevMilesIncome: number;
    let prevChildSeatIncome: number;
    let prevCoolersIncome: number;
    let prevInsuranceWreckIncome: number;
    let prevOtherIncome: number;
    let prevNegativeBalanceCarryOver: number;
    let prevTotalDirectDelivery: number;
    let prevTotalCogs: number;
    let prevCarOwnerSplitPercent: number;
    
    // January of other years (2020+): Use December of previous year
    if (month === 1 && currentYear > 2019) {
      const prevDec = 12;
      prevRentalIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "rentalIncome");
      prevDeliveryIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "deliveryIncome");
      prevElectricPrepaidIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "electricPrepaidIncome");
      prevSmokingFines = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "smokingFines");
      prevGasPrepaidIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "gasPrepaidIncome");
      prevSkiRacksIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "skiRacksIncome");
      prevMilesIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "milesIncome");
      prevChildSeatIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "childSeatIncome");
      prevCoolersIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "coolersIncome");
      prevInsuranceWreckIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "insuranceWreckIncome");
      prevOtherIncome = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "otherIncome");
      
      // Calculate previous year December's negative balance carry over
      // Note: We need to get the mode from previous year, but we don't have that data easily accessible
      // For now, we'll default to 50 (50:50) for previous year calculations
      prevNegativeBalanceCarryOver = calculatePrevYearNegativeBalance(prevDec, 50);
      
      prevTotalDirectDelivery = getPrevYearTotalDirectDelivery(prevDec);
      prevTotalCogs = getPrevYearTotalCogs(prevDec);
      prevCarOwnerSplitPercent = getPrevYearValue(prevYearDecData?.incomeExpenses || [], prevDec, "carOwnerSplit") || 0;
      
      // Default to 50:50 mode for previous year (we don't have easy access to previous year's monthModes)
      prevMonthMode = 50;
    } else {
      // All other months (Feb-Dec): Use previous month
      const prevMonth = month - 1;
      prevRentalIncome = getMonthValue(data.incomeExpenses, prevMonth, "rentalIncome");
      prevDeliveryIncome = getMonthValue(data.incomeExpenses, prevMonth, "deliveryIncome");
      prevElectricPrepaidIncome = getMonthValue(data.incomeExpenses, prevMonth, "electricPrepaidIncome");
      prevSmokingFines = getMonthValue(data.incomeExpenses, prevMonth, "smokingFines");
      prevGasPrepaidIncome = getMonthValue(data.incomeExpenses, prevMonth, "gasPrepaidIncome");
      prevSkiRacksIncome = getMonthValue(data.incomeExpenses, prevMonth, "skiRacksIncome");
      prevMilesIncome = getMonthValue(data.incomeExpenses, prevMonth, "milesIncome");
      prevChildSeatIncome = getMonthValue(data.incomeExpenses, prevMonth, "childSeatIncome");
      prevCoolersIncome = getMonthValue(data.incomeExpenses, prevMonth, "coolersIncome");
      prevInsuranceWreckIncome = getMonthValue(data.incomeExpenses, prevMonth, "insuranceWreckIncome");
      prevOtherIncome = getMonthValue(data.incomeExpenses, prevMonth, "otherIncome");
      
      // Use the calculated value from previous month (recursive call)
      prevNegativeBalanceCarryOver = calculateNegativeBalanceCarryOver(prevMonth);
      
      prevTotalDirectDelivery = getTotalDirectDeliveryForMonth(prevMonth);
      prevTotalCogs = getTotalCogsForMonth(prevMonth);
      prevCarOwnerSplitPercent = getMonthValue(data.incomeExpenses, prevMonth, "carOwnerSplit") || 0;
      
      // Get mode from previous month
      prevMonthMode = monthModes[prevMonth] || 50;
    }
    
    const prevCarOwnerSplitDecimal = prevCarOwnerSplitPercent / 100;
    
    let calculation: number;
    
    if (prevMonthMode === 70) {
      // 30:70 Mode Formula
      // =IF(
      //   (Miles Income + (Smoking Fines*10%)) - TOTAL OPERATING EXPENSE (Direct Delivery) 
      //   - TOTAL OPERATING EXPENSE (COGS - Per Vehicle) - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
      //   + Negative Balance Carry Over
      //   + (Rental Income - Delivery Income - Electric Prepaid Income - Smoking Fines - Gas Prepaid Income 
      //      - Miles Income - Ski Racks Income - Child Seat Income - Coolers Income - Insurance Wreck Income - Other Income)
      //   * Car Owner Split% <=0,
      //   [return calculation],
      //   0
      // )
      const part1 = prevMilesIncome + (prevSmokingFines * 0.1);
      const part2 = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - prevSmokingFines 
                   - prevGasPrepaidIncome - prevMilesIncome - prevSkiRacksIncome - prevChildSeatIncome 
                   - prevCoolersIncome - prevInsuranceWreckIncome - prevOtherIncome;
      calculation = part1 - prevTotalDirectDelivery - prevTotalCogs - prevTotalCogs 
                   + prevNegativeBalanceCarryOver + (part2 * prevCarOwnerSplitDecimal);
      
      // If calculation <= 0, return calculation; otherwise return 0
      return calculation <= 0 ? calculation : 0;
    } else {
      // 50:50 Mode Formula
      // =IF(
      //   Rental Income - Delivery Income - Electric Prepaid Income - Gas Prepaid Income - Smoking Fines
      //   - Miles Income - Ski Racks Income - Child Seat Income - Coolers Income - Insurance Wreck Income - Other Income
      //   - TOTAL OPERATING EXPENSE (Direct Delivery) - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
      //   + Negative Balance Carry Over > 0,
      //   0,
      //   [return calculation]
      // )
      calculation = prevRentalIncome - prevDeliveryIncome - prevElectricPrepaidIncome - prevGasPrepaidIncome 
                   - prevSmokingFines - prevMilesIncome - prevSkiRacksIncome - prevChildSeatIncome 
                   - prevCoolersIncome - prevInsuranceWreckIncome - prevOtherIncome 
                   - prevTotalDirectDelivery - prevTotalCogs + prevNegativeBalanceCarryOver;
      
      // If calculation > 0, return 0; otherwise return calculation
      return calculation > 0 ? 0 : calculation;
    }
  };

  // Calculate Car Management Split based on formula:
  // If ski racks income exists and ski racks owner is set, use special formulas
  // Otherwise use standard formula:
  // MAX(
  //   Delivery Income + 
  //   Electric Prepaid Income +
  //   Smoking Fines +
  //   Gas Prepaid Income - TOTAL REIMBURSE AND NON-REIMBURSE BILLS
  //   +
  //   (
  //     Rental Income + 
  //     Negative Balance Carry Over -
  //     Delivery Income -
  //     Electric Prepaid Income -
  //     Smoking Fines -
  //     Gas Prepaid Income -
  //     Miles Income -
  //     TOTAL OPERATING EXPENSE (Direct Delivery)- 
  //     TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
  //   )
  //    * (Car Management Split percent )
  // , 0
  // )
  const calculateCarManagementSplit = (month: number): number => {
    // Use stored percentage, default to 0 if not set (independent of car owner split)
    const storedPercent = getMonthValue(data.incomeExpenses, month, "carManagementSplit") || 0;
    const mgmtPercent = storedPercent / 100; // Split percentage for management
    
    const rentalIncome = getMonthValue(data.incomeExpenses, month, "rentalIncome");
    const deliveryIncome = getMonthValue(data.incomeExpenses, month, "deliveryIncome");
    const electricPrepaidIncome = getMonthValue(data.incomeExpenses, month, "electricPrepaidIncome");
    const smokingFines = getMonthValue(data.incomeExpenses, month, "smokingFines");
    const gasPrepaidIncome = getMonthValue(data.incomeExpenses, month, "gasPrepaidIncome");
    const skiRacksIncome = getMonthValue(data.incomeExpenses, month, "skiRacksIncome");
    const milesIncome = getMonthValue(data.incomeExpenses, month, "milesIncome");
    const childSeatIncome = getMonthValue(data.incomeExpenses, month, "childSeatIncome");
    const coolersIncome = getMonthValue(data.incomeExpenses, month, "coolersIncome");
    const insuranceWreckIncome = getMonthValue(data.incomeExpenses, month, "insuranceWreckIncome");
    const otherIncome = getMonthValue(data.incomeExpenses, month, "otherIncome");
    // Use calculated Negative Balance Carry Over (January 2019 will be 0, other Januaries use previous year's December)
    const negativeBalanceCarryOver = calculateNegativeBalanceCarryOver(month);
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    const totalReimbursedBills = getTotalReimbursedBillsForMonth(month);
    
    // From 2026 onwards, use formulas that include ski racks income
    // Before 2026, ignore ski racks income and always use standard formula
    const currentYear = parseInt(year, 10);
    const isYear2026OrLater = currentYear >= 2026;
    const useSkiRacksFormula = isYear2026OrLater && skiRacksIncome > 0;
    const use2026NoSkiRacksFormula = isYear2026OrLater && skiRacksIncome === 0;
    
    // Check if ski racks income exists and use appropriate formula
    if (useSkiRacksFormula) {
      const owner = skiRacksOwner[month] || "GLA";
      
      if (owner === "GLA") {
        // If GLA owns ski racks:
        // Car Management Split = MAX(Part 1 + Part 2, 0)
        // Part 1 = Delivery Income + Electric Prepaid Income + Gas Prepaid Income + 
        //          Child Seat Income + Coolers Income + Insurance Wreck Income + 
        //          Other Income + Ski Racks Income + (Smoking Fines × 90%) - 
        //          TOTAL REIMBURSE AND NON-REIMBURSE BILLS
        const part1 = deliveryIncome + electricPrepaidIncome + gasPrepaidIncome + 
                     childSeatIncome + coolersIncome + insuranceWreckIncome + 
                     otherIncome + skiRacksIncome + (smokingFines * 0.9) - totalReimbursedBills;
        const profit = rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * mgmtPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      } else {
        // If car owner owns ski racks:
        // Car Management Split = MAX(Part 1 + Part 2, 0)
        // Part 1 = Delivery Income + Electric Prepaid Income + Gas Prepaid Income + 
        //          Child Seat Income + Coolers Income + Insurance Wreck Income + 
        //          Other Income + (Smoking Fines × 90%) - 
        //          TOTAL REIMBURSE AND NON-REIMBURSE BILLS
        const part1 = deliveryIncome + electricPrepaidIncome + gasPrepaidIncome + 
                     childSeatIncome + coolersIncome + insuranceWreckIncome + 
                     otherIncome + (smokingFines * 0.9) - totalReimbursedBills;
        const profit = rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
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
      const part2 = (rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                    smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * mgmtPercent;
      const calculation = part1 + part2;
      return calculation >= 0 ? calculation : 0;
    }
    
    // Standard formula when year < 2026
    // Part 1: Delivery Income + Electric Prepaid Income + Smoking Fines + Gas Prepaid Income - TOTAL REIMBURSE AND NON-REIMBURSE BILLS
    const part1 = deliveryIncome + electricPrepaidIncome + smokingFines + gasPrepaidIncome - totalReimbursedBills;
    
    // Part 2: (Rental Income + Negative Balance Carry Over - Delivery Income - Electric Prepaid Income - Smoking Fines - Gas Prepaid Income - Miles Income - TOTAL OPERATING EXPENSE (Direct Delivery) - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)) * Car Management Split percent
    const part2 = (rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                   smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * mgmtPercent;
    
    // Full calculation: part1 + part2
    const calculation = part1 + part2;
    
    return calculation >= 0 ? calculation : 0;
  };

  // Calculate Car Owner Split based on formula:
  // If ski racks income exists and ski racks owner is set, use special formulas
  // Otherwise use standard formula:
  // MAX(
  //   (Miles Income) + 
  //   (Rental Income + Negative Balance Carry Over - Delivery Income - Electric Prepaid Income - 
  //    Smoking Fines - Gas Prepaid Income - Miles Income - TOTAL OPERATING EXPENSE (Direct Delivery) - 
  //    TOTAL OPERATING EXPENSE (COGS - Per Vehicle)) * Car Owner Split % 
  // , 0
  // )
  // Note: January should NOT use Negative Balance Carry Over (use 0 instead)
  const calculateCarOwnerSplit = (month: number): number => {
    // Use stored percentage, default to 0 if not set (independent of car management split)
    const storedPercent = getMonthValue(data.incomeExpenses, month, "carOwnerSplit") || 0;
    const ownerPercent = storedPercent / 100; // Split percentage for owner
    
    const rentalIncome = getMonthValue(data.incomeExpenses, month, "rentalIncome");
    const deliveryIncome = getMonthValue(data.incomeExpenses, month, "deliveryIncome");
    const electricPrepaidIncome = getMonthValue(data.incomeExpenses, month, "electricPrepaidIncome");
    const smokingFines = getMonthValue(data.incomeExpenses, month, "smokingFines");
    const gasPrepaidIncome = getMonthValue(data.incomeExpenses, month, "gasPrepaidIncome");
    const skiRacksIncome = getMonthValue(data.incomeExpenses, month, "skiRacksIncome");
    const milesIncome = getMonthValue(data.incomeExpenses, month, "milesIncome");
    const childSeatIncome = getMonthValue(data.incomeExpenses, month, "childSeatIncome");
    const coolersIncome = getMonthValue(data.incomeExpenses, month, "coolersIncome");
    const insuranceWreckIncome = getMonthValue(data.incomeExpenses, month, "insuranceWreckIncome");
    const otherIncome = getMonthValue(data.incomeExpenses, month, "otherIncome");
    // Use calculated Negative Balance Carry Over (January 2019 will be 0, other Januaries use previous year's December)
    const negativeBalanceCarryOver = calculateNegativeBalanceCarryOver(month);
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    // From 2026 onwards, use formulas that include ski racks income
    // Before 2026, ignore ski racks income and always use standard formula
    const currentYear = parseInt(year, 10);
    const isYear2026OrLater = currentYear >= 2026;
    const useSkiRacksFormula = isYear2026OrLater && skiRacksIncome > 0;
    const use2026NoSkiRacksFormula = isYear2026OrLater && skiRacksIncome === 0;
    
    // Check if ski racks income exists and use appropriate formula
    if (useSkiRacksFormula) {
      const owner = skiRacksOwner[month] || "GLA";
      
      if (owner === "GLA") {
        // If GLA owns ski racks:
        // Car Owner Split = MAX(Part 1 + Part 2, 0)
        // Part 1 = Miles Income + (Smoking Fines × 10%)
        const part1 = milesIncome + (smokingFines * 0.1);
        const profit = rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                      smokingFines - skiRacksIncome - milesIncome - gasPrepaidIncome - childSeatIncome - 
                      coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs;
        const part2 = profit * ownerPercent;
        const calculation = part1 + part2;
        return calculation >= 0 ? calculation : 0;
      } else {
        // If car owner owns ski racks:
        // Car Owner Split = MAX(Part 1 + Part 2, 0)
        // Part 1 = Miles Income + Gas Prepaid Income + (Smoking Fines × 10%)
        const part1 = milesIncome + gasPrepaidIncome + (smokingFines * 0.1);
        const profit = rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
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
      const part2 = (rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                    smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * ownerPercent;
      const calculation = part1 + part2;
      return calculation >= 0 ? calculation : 0;
    }
    
    // Standard formula when year < 2026
    // Part 1: Miles Income
    const part1 = milesIncome;
    
    // Part 2: (Rental Income + Negative Balance Carry Over - Delivery Income - Electric Prepaid Income - 
    //          Smoking Fines - Gas Prepaid Income - Miles Income - TOTAL OPERATING EXPENSE (Direct Delivery) - 
    //          TOTAL OPERATING EXPENSE (COGS - Per Vehicle)) * Car Owner Split %
    const part2 = (rentalIncome - Math.abs(negativeBalanceCarryOver) - deliveryIncome - electricPrepaidIncome - 
                   smokingFines - gasPrepaidIncome - milesIncome - totalDirectDelivery - totalCogs) * ownerPercent;
    
    const calculation = part1 + part2;
    
    return calculation >= 0 ? calculation : 0;
  };

  // Calculate Car Management Total Expenses:
  // In 30:70 mode: "TOTAL REIMBURSE AND NON-REIMBURSE BILLS" only
  // In 50:50 mode: "TOTAL REIMBURSE AND NON-REIMBURSE BILLS" + ("TOTAL OPERATING EXPENSE (Direct Delivery)" + "TOTAL OPERATING EXPENSE (COGS - Per Vehicle)") * "Car Management Split %"
  const calculateCarManagementTotalExpenses = (month: number): number => {
    const totalReimbursedBills = getTotalReimbursedBillsForMonth(month);
    
    // Get the mode for this month
    const mode = monthModes[month] || 50;
    
    // In 30:70 mode, return only TOTAL REIMBURSE AND NON-REIMBURSE BILLS
    if (mode === 70) {
      return totalReimbursedBills;
    }
    
    // In 50:50 mode, use the full formula
    const storedMgmtPercent = Number(getMonthValue(data.incomeExpenses, month, "carManagementSplit")) || 0;
    const mgmtPercent = storedMgmtPercent / 100; // Convert percentage to decimal
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    return totalReimbursedBills + ((totalDirectDelivery + totalCogs) * mgmtPercent);
  };

  // Calculate Car Owner Total Expenses:
  // In 30:70 mode: "TOTAL OPERATING EXPENSE (Direct Delivery)" + "TOTAL OPERATING EXPENSE (COGS - Per Vehicle)" + "Total Parking Fee & Labor Cleaning"
  // In 50:50 mode: ("TOTAL OPERATING EXPENSE (Direct Delivery)" + "TOTAL OPERATING EXPENSE (COGS - Per Vehicle)") * "Car Owner Split %"
  const calculateCarOwnerTotalExpenses = (month: number): number => {
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    // Get the mode for this month
    const mode = monthModes[month] || 50;
    
    if (mode === 70) {
      // 30:70 mode: Direct Delivery + COGS + Total Parking Fee & Labor Cleaning
      const totalParkingFeeLabor = getTotalParkingFeeLaborForMonth(month);
      return totalDirectDelivery + totalCogs + totalParkingFeeLabor;
    } else {
      // 50:50 mode: (Direct Delivery + COGS) * Car Owner Split %
      const storedOwnerPercent = Number(getMonthValue(data.incomeExpenses, month, "carOwnerSplit")) || 0;
      const ownerPercent = storedOwnerPercent / 100; // Convert percentage to decimal
      return (totalDirectDelivery + totalCogs) * ownerPercent;
    }
  };

  // Helper function to get split for a specific month
  const getSplitForMonth = (month: number) => {
    const mode = monthModes[month];
    if (mode === 70) {
      return { mgmt: 30, owner: 70 }; // 70 mode = 30:70 split (Car Management : Car Owner)
    }
    return { mgmt: 50, owner: 50 }; // 50 mode = 50:50 split
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1" style={{ maxHeight: '100%' }}>
        <table className="w-full border-collapse text-xs">
          {/* Table Header */}
          <thead className="sticky top-0 z-40 bg-[#1a1a1a]">
            <tr>
              <th className="sticky left-0 z-50 bg-[#1a1a1a] border-r border-[#2a2a2a] px-3 py-2 text-left text-white min-w-[200px]">
                Category
              </th>
              {MONTHS.map((month, index) => {
                const monthNum = index + 1;
                const currentYear = parseInt(year, 10);
                const showSkiRacksToggle = currentYear >= 2026;
                const currentMode = monthModes[monthNum] || 50;
                const currentSkiRacksOwner = skiRacksOwner[monthNum] || "GLA";
                const hasSkiRacksIncome = getMonthValue(data.incomeExpenses, monthNum, "skiRacksIncome") > 0;
                return (
                  <th
                    key={month}
                    className="border-l border-[#2a2a2a] px-2 py-2 text-center min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white text-xs">{month} {year}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={isReadOnly ? undefined : () => toggleMonthMode(monthNum)}
                          disabled={isSavingMode || isReadOnly}
                          className={cn(
                            "px-3 py-0.5 rounded-full text-xs font-semibold transition-all duration-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            currentMode === 50 
                              ? "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-lg shadow-green-600/50" 
                              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-600/50",
                            isSavingMode && "animate-pulse",
                            isReadOnly && "cursor-default hover:bg-inherit active:bg-inherit"
                          )}
                          title={
                            isReadOnly 
                              ? `Rate mode: ${currentMode === 50 ? "50:50 (green)" : "30:70 (blue)"} (Read-only)`
                              : isSavingMode 
                                ? "Saving mode change..." 
                                : `Click to toggle between 50:50 (green) and 30:70 (blue) split`
                          }
                        >
                          {isSavingMode ? "..." : currentMode}
                        </button>
                        {showSkiRacksToggle && hasSkiRacksIncome && (
                        <button
                          onClick={isReadOnly ? undefined : () => toggleSkiRacksOwner(monthNum)}
                          disabled={isSavingSkiRacksOwner || isReadOnly}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 min-w-[24px]",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            currentSkiRacksOwner === "GLA"
                              ? "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-lg shadow-purple-600/50"
                              : "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-lg shadow-orange-600/50",
                            isSavingSkiRacksOwner && "animate-pulse",
                            isReadOnly && "cursor-default hover:bg-inherit active:bg-inherit"
                          )}
                          title={
                            isReadOnly
                              ? `Ski racks owner: ${currentSkiRacksOwner === "GLA" ? "Management/GLA (purple)" : "Owner (orange)"} (Read-only)`
                              : isSavingSkiRacksOwner 
                                ? "Saving ski racks owner..." 
                                : `Click to toggle ski racks owner: ${currentSkiRacksOwner === "GLA" ? "Management/GLA (purple)" : "Owner (orange)"}`
                          }
                        >
                          {isSavingSkiRacksOwner ? "..." : currentSkiRacksOwner === "GLA" ? "M" : "O"}
                        </button>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-30 border-l border-[#2a2a2a] px-2 py-2 text-center text-white min-w-[100px] bg-[#1f1f1f] font-bold">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {/* CAR MANAGEMENT AND OWNER SPLIT */}
            <CategorySection
              title="CAR MANAGEMENT OWNER SPLIT"
              isExpanded={expandedSections.managementOwner}
              onToggle={() => toggleSection("managementOwner")}
            >
              {/* Car Management Split - Shows calculated amount + percentage */}
              <CategoryRow
                label="Car Management Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const calculatedAmount = calculateCarManagementSplit(monthNum);
                  return calculatedAmount; // Return calculated amount for display
                })}
                percentageValues={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return getMonthValue(data.incomeExpenses, monthNum, "carManagementSplit");
                })}
                category="income"
                field="carManagementSplit"
                isEditable={!isReadOnly}
                formatType="managementSplit"
                monthModes={monthModes}
                showAmountAndPercentage={true}
              />
              {/* Car Owner Split - Shows calculated amount + percentage */}
              <CategoryRow
                label="Car Owner Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const calculatedAmount = calculateCarOwnerSplit(monthNum);
                  return calculatedAmount; // Return calculated amount for display
                })}
                percentageValues={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return getMonthValue(data.incomeExpenses, monthNum, "carOwnerSplit");
                })}
                category="income"
                field="carOwnerSplit"
                isEditable={!isReadOnly}
                formatType="ownerSplit"
                monthModes={monthModes}
                showAmountAndPercentage={true}
              />
            </CategorySection>

            {/* INCOME & EXPENSES */}
            <CategorySection
              title="INCOME & EXPENSES"
              isExpanded={expandedSections.incomeExpenses}
              onToggle={() => toggleSection("incomeExpenses")}
            >
              <CategoryRow
                label="Rental Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "rentalIncome"))}
                category="income"
                field="rentalIncome"
              />
              <CategoryRow
                label="Delivery Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "deliveryIncome"))}
                category="income"
                field="deliveryIncome"
              />
              <CategoryRow
                label="Electric Prepaid Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "electricPrepaidIncome"))}
                category="income"
                field="electricPrepaidIncome"
              />
              <CategoryRow
                label="Smoking Fines"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "smokingFines"))}
                category="income"
                field="smokingFines"
              />
              <CategoryRow
                label="Gas Prepaid Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "gasPrepaidIncome"))}
                category="income"
                field="gasPrepaidIncome"
              />
              <CategoryRow
                label="Ski Racks Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "skiRacksIncome"))}
                category="income"
                field="skiRacksIncome"
              />
              <CategoryRow
                label="Miles Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "milesIncome"))}
                category="income"
                field="milesIncome"
              />
              <CategoryRow
                label="Child Seat Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "childSeatIncome"))}
                category="income"
                field="childSeatIncome"
              />
              <CategoryRow
                label="Coolers Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "coolersIncome"))}
                category="income"
                field="coolersIncome"
              />
              <CategoryRow
                label="Income insurance and Client Wrecks"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "insuranceWreckIncome"))}
                category="income"
                field="insuranceWreckIncome"
              />
              <CategoryRow
                label="Other Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "otherIncome"))}
                category="income"
                field="otherIncome"
              />
              <CategoryRow
                label="Negative Balance Carry Over"
                values={MONTHS.map((_, i) => calculateNegativeBalanceCarryOver(i + 1))}
                category="income"
                field="negativeBalanceCarryOver"
                isEditable={false} // All months are calculated (January is always 0, not editable)
                hideTotal={true} // Hide total column
              />
              <CategoryRow
                label="Car Payment"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "carPayment"))}
                category="income"
                field="carPayment"
                isEditable={false}
              />
              <CategoryRow
                label="Car Management Total Expenses"
                values={MONTHS.map((_, i) => calculateCarManagementTotalExpenses(i + 1))}
                category="income"
                field="carManagementTotalExpenses"
                isEditable={false}
              />
              <CategoryRow
                label="Car Owner Total Expenses"
                values={MONTHS.map((_, i) => calculateCarOwnerTotalExpenses(i + 1))}
                category="income"
                field="carOwnerTotalExpenses"
                isEditable={false}
              />
              <CategoryRow
                label="Total Expenses"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const mgmt = calculateCarManagementTotalExpenses(monthNum);
                  const owner = calculateCarOwnerTotalExpenses(monthNum);
                  return mgmt + owner;
                })}
                isEditable={false}
              />
              <CategoryRow
                label="Total Car Profit"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const rentalIncome = getMonthValue(data.incomeExpenses, monthNum, "rentalIncome");
                  const mgmt = calculateCarManagementTotalExpenses(monthNum);
                  const owner = calculateCarOwnerTotalExpenses(monthNum);
                  const totalExpenses = mgmt + owner;
                  return rentalIncome - totalExpenses;
                })}
                isEditable={false}
              />
            </CategorySection>

            {/* OPERATING EXPENSE (Direct Delivery) */}
            <CategorySection
              title="OPERATING EXPENSE (Direct Delivery)"
              isExpanded={expandedSections.directDelivery}
              onToggle={() => toggleSection("directDelivery")}
            >
              <CategoryRow
                label="Labor - Cleaning"
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "laborCarCleaning"))}
                category="directDelivery"
                field="laborCarCleaning"
              />
              <CategoryRow
                label="Labor - Delivery"
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "laborDelivery"))}
                category="directDelivery"
                field="laborDelivery"
              />
              <CategoryRow
                label="Parking - Airport"
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "parkingAirport"))}
                category="directDelivery"
                field="parkingAirport"
              />
              <CategoryRow
                label="Parking - Lot"
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "parkingLot"))}
                category="directDelivery"
                field="parkingLot"
              />
              <CategoryRow
                label="Uber/Lyft/Lime"
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "uberLyftLime"))}
                category="directDelivery"
                field="uberLyftLime"
              />
              {/* Dynamic Subcategories */}
              {dynamicSubcategories.directDelivery.map((subcat) => (
                <DynamicSubcategoryRow
                  key={subcat.id}
                  subcategory={subcat}
                  categoryType="directDelivery"
                  onEditName={() => setEditSubcategoryModal({
                    open: true,
                    categoryType: "directDelivery",
                    metadataId: subcat.id,
                    currentName: subcat.name,
                    newName: subcat.name,
                  })}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${subcat.name}"?`)) {
                      deleteDynamicSubcategory("directDelivery", subcat.id);
                    }
                  }}
                  onUpdateValue={updateDynamicSubcategoryValue}
                  isReadOnly={isReadOnly}
                />
              ))}
              {/* Add Subcategory Button */}
              {!isReadOnly && (
                <tr>
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() => setAddSubcategoryModal({ open: true, categoryType: "directDelivery", name: "" })}
                      className="flex items-center gap-2 text-xs text-[#EAEB80] hover:text-[#d4d570] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subcategory
                    </button>
                  </td>
                </tr>
              )}
              <CategoryRow
                label="TOTAL OPERATING EXPENSE (Direct Delivery)"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const fixedTotal = (
                    getMonthValue(data.directDelivery, monthNum, "laborCarCleaning") +
                    getMonthValue(data.directDelivery, monthNum, "laborDelivery") +
                    getMonthValue(data.directDelivery, monthNum, "parkingAirport") +
                    getMonthValue(data.directDelivery, monthNum, "parkingLot") +
                    getMonthValue(data.directDelivery, monthNum, "uberLyftLime")
                  );
                  const dynamicTotal = dynamicSubcategories.directDelivery.reduce((sum, subcat) => {
                    const monthValue = subcat.values.find((v: any) => v.month === monthNum);
                    return sum + (monthValue?.value || 0);
                  }, 0);
                  return fixedTotal + dynamicTotal;
                })}
                isEditable={false}
                isTotal
              />
            </CategorySection>

            {/* OPERATING EXPENSE (COGS - Per Vehicle) */}
            <CategorySection
              title="OPERATING EXPENSE (COGS - Per Vehicle)"
              isExpanded={expandedSections.cogs}
              onToggle={() => toggleSection("cogs")}
            >
              <CategoryRow
                label="Auto Body Shop / Wreck"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "autoBodyShopWreck"))}
                category="cogs"
                field="autoBodyShopWreck"
              />
              <CategoryRow
                label="Alignment"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "alignment"))}
                category="cogs"
                field="alignment"
              />
              <CategoryRow
                label="Battery"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "battery"))}
                category="cogs"
                field="battery"
              />
              <CategoryRow
                label="Brakes"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "brakes"))}
                category="cogs"
                field="brakes"
              />
              <CategoryRow
                label="Car Payment"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "carPayment"))}
                category="cogs"
                field="carPayment"
              />
              <CategoryRow
                label="Car Insurance"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "carInsurance"))}
                category="cogs"
                field="carInsurance"
              />
              <CategoryRow
                label="Car Seats"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "carSeats"))}
                category="cogs"
                field="carSeats"
              />
              <CategoryRow
                label="Cleaning Supplies / Tools"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "cleaningSuppliesTools"))}
                category="cogs"
                field="cleaningSuppliesTools"
              />
              <CategoryRow
                label="Emissions"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "emissions"))}
                category="cogs"
                field="emissions"
              />
              <CategoryRow
                label="GPS System"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "gpsSystem"))}
                category="cogs"
                field="gpsSystem"
              />
              <CategoryRow
                label="Key & Fob"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "keyFob"))}
                category="cogs"
                field="keyFob"
              />
              <CategoryRow
                label="Labor - Cleaning"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "laborCleaning"))}
                category="cogs"
                field="laborCleaning"
              />
              <CategoryRow
                label="License & Registration"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "licenseRegistration"))}
                category="cogs"
                field="licenseRegistration"
              />
              <CategoryRow
                label="Mechanic"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "mechanic"))}
                category="cogs"
                field="mechanic"
              />
              <CategoryRow
                label="Oil/Lube"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "oilLube"))}
                category="cogs"
                field="oilLube"
              />
              <CategoryRow
                label="Parts"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "parts"))}
                category="cogs"
                field="parts"
              />
              <CategoryRow
                label="Ski Racks"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "skiRacks"))}
                category="cogs"
                field="skiRacks"
              />
              <CategoryRow
                label="Tickets & Tolls"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "tickets"))}
                category="cogs"
                field="tickets"
              />
              <CategoryRow
                label="Tired Air Station"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "tiredAirStation"))}
                category="cogs"
                field="tiredAirStation"
              />
              <CategoryRow
                label="Tires"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "tires"))}
                category="cogs"
                field="tires"
              />
              <CategoryRow
                label="Towing / Impound Fees"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "towingImpoundFees"))}
                category="cogs"
                field="towingImpoundFees"
              />
              <CategoryRow
                label="Uber/Lyft/Lime"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "uberLyftLime"))}
                category="cogs"
                field="uberLyftLime"
              />
              <CategoryRow
                label="Windshield"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "windshield"))}
                category="cogs"
                field="windshield"
              />
              <CategoryRow
                label="Wipers"
                values={MONTHS.map((_, i) => getMonthValue(data.cogs, i + 1, "wipers"))}
                category="cogs"
                field="wipers"
              />
              {/* Dynamic Subcategories */}
              {dynamicSubcategories.cogs.map((subcat) => (
                <DynamicSubcategoryRow
                  key={subcat.id}
                  subcategory={subcat}
                  categoryType="cogs"
                  onEditName={() => setEditSubcategoryModal({
                    open: true,
                    categoryType: "cogs",
                    metadataId: subcat.id,
                    currentName: subcat.name,
                    newName: subcat.name,
                  })}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${subcat.name}"?`)) {
                      deleteDynamicSubcategory("cogs", subcat.id);
                    }
                  }}
                  onUpdateValue={updateDynamicSubcategoryValue}
                  isReadOnly={isReadOnly}
                />
              ))}
              {/* Add Subcategory Button */}
              {!isReadOnly && (
                <tr>
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() => setAddSubcategoryModal({ open: true, categoryType: "cogs", name: "" })}
                      className="flex items-center gap-2 text-xs text-[#EAEB80] hover:text-[#d4d570] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subcategory
                    </button>
                  </td>
                </tr>
              )}
              <CategoryRow
                label="TOTAL OPERATING EXPENSE (COGS - Per Vehicle)"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const fixedTotal = (
                    getMonthValue(data.cogs, monthNum, "autoBodyShopWreck") +
                    getMonthValue(data.cogs, monthNum, "alignment") +
                    getMonthValue(data.cogs, monthNum, "battery") +
                    getMonthValue(data.cogs, monthNum, "brakes") +
                    getMonthValue(data.cogs, monthNum, "carPayment") +
                    getMonthValue(data.cogs, monthNum, "carInsurance") +
                    getMonthValue(data.cogs, monthNum, "carSeats") +
                    getMonthValue(data.cogs, monthNum, "cleaningSuppliesTools") +
                    getMonthValue(data.cogs, monthNum, "emissions") +
                    getMonthValue(data.cogs, monthNum, "gpsSystem") +
                    getMonthValue(data.cogs, monthNum, "keyFob") +
                    getMonthValue(data.cogs, monthNum, "laborCleaning") +
                    getMonthValue(data.cogs, monthNum, "licenseRegistration") +
                    getMonthValue(data.cogs, monthNum, "mechanic") +
                    getMonthValue(data.cogs, monthNum, "oilLube") +
                    getMonthValue(data.cogs, monthNum, "parts") +
                    getMonthValue(data.cogs, monthNum, "skiRacks") +
                    getMonthValue(data.cogs, monthNum, "tickets") +
                    getMonthValue(data.cogs, monthNum, "tiredAirStation") +
                    getMonthValue(data.cogs, monthNum, "tires") +
                    getMonthValue(data.cogs, monthNum, "towingImpoundFees") +
                    getMonthValue(data.cogs, monthNum, "uberLyftLime") +
                    getMonthValue(data.cogs, monthNum, "windshield") +
                    getMonthValue(data.cogs, monthNum, "wipers")
                  );
                  const dynamicTotal = dynamicSubcategories.cogs.reduce((sum, subcat) => {
                    const monthValue = subcat.values.find((v: any) => v.month === monthNum);
                    return sum + (monthValue?.value || 0);
                  }, 0);
                  return fixedTotal + dynamicTotal;
                })}
                isEditable={false}
                isTotal
              />
            </CategorySection>

            {/* Parking Fee & Labor Cleaning */}
            <CategorySection
              title="Parking Fee & Labor Cleaning"
              isExpanded={expandedSections.parkingFeeLabor}
              onToggle={() => toggleSection("parkingFeeLabor")}
            >
              <CategoryRow
                label="GLA Parking Fee"
                values={MONTHS.map((_, i) => getMonthValue(data.parkingFeeLabor, i + 1, "glaParkingFee"))}
                category="parkingFeeLabor"
                field="glaParkingFee"
              />
              <CategoryRow
                label="Labor - Cleaning"
                values={MONTHS.map((_, i) => getMonthValue(data.parkingFeeLabor, i + 1, "laborCleaning"))}
                category="parkingFeeLabor"
                field="laborCleaning"
              />
              {/* Dynamic Subcategories */}
              {dynamicSubcategories.parkingFeeLabor.map((subcat) => (
                <DynamicSubcategoryRow
                  key={subcat.id}
                  subcategory={subcat}
                  categoryType="parkingFeeLabor"
                  onEditName={() => setEditSubcategoryModal({
                    open: true,
                    categoryType: "parkingFeeLabor",
                    metadataId: subcat.id,
                    currentName: subcat.name,
                    newName: subcat.name,
                  })}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${subcat.name}"?`)) {
                      deleteDynamicSubcategory("parkingFeeLabor", subcat.id);
                    }
                  }}
                  onUpdateValue={updateDynamicSubcategoryValue}
                  isReadOnly={isReadOnly}
                />
              ))}
              {/* Add Subcategory Button */}
              {!isReadOnly && (
                <tr>
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() => setAddSubcategoryModal({ open: true, categoryType: "parkingFeeLabor", name: "" })}
                      className="flex items-center gap-2 text-xs text-[#EAEB80] hover:text-[#d4d570] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subcategory
                    </button>
                  </td>
                </tr>
              )}
              <CategoryRow
                label="Total Parking Fee & Labor Cleaning"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const fixedTotal = (
                    getMonthValue(data.parkingFeeLabor, monthNum, "glaParkingFee") +
                    getMonthValue(data.parkingFeeLabor, monthNum, "laborCleaning")
                  );
                  const dynamicTotal = dynamicSubcategories.parkingFeeLabor.reduce((sum, subcat) => {
                    const monthValue = subcat.values.find((v: any) => v.month === monthNum);
                    return sum + (monthValue?.value || 0);
                  }, 0);
                  return fixedTotal + dynamicTotal;
                })}
                isEditable={false}
                isTotal
              />
            </CategorySection>

            {/* REIMBURSE AND NON-REIMBURSE BILLS */}
            <CategorySection
              title="REIMBURSE AND NON-REIMBURSE BILLS"
              isExpanded={expandedSections.reimbursedBills}
              onToggle={() => toggleSection("reimbursedBills")}
            >
              <CategoryRow
                label="Electric - Reimbursed"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "electricReimbursed"))}
                category="reimbursedBills"
                field="electricReimbursed"
              />
              <CategoryRow
                label="Electric - Not Reimbursed"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "electricNotReimbursed"))}
                category="reimbursedBills"
                field="electricNotReimbursed"
              />
              <CategoryRow
                label="Gas - Reimbursed"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "gasReimbursed"))}
                category="reimbursedBills"
                field="gasReimbursed"
              />
              <CategoryRow
                label="Gas - Not Reimbursed"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "gasNotReimbursed"))}
                category="reimbursedBills"
                field="gasNotReimbursed"
              />
              <CategoryRow
                label="Gas - Service Run"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "gasServiceRun"))}
                category="reimbursedBills"
                field="gasServiceRun"
              />
              <CategoryRow
                label="Parking Airport"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "parkingAirport"))}
                category="reimbursedBills"
                field="parkingAirport"
              />
              <CategoryRow
                label="Uber/Lyft/Lime - Not Reimbursed (added)"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "uberLyftLimeNotReimbursed"))}
                category="reimbursedBills"
                field="uberLyftLimeNotReimbursed"
              />
              <CategoryRow
                label="Uber/Lyft/Lime - Reimbursed (added)"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "uberLyftLimeReimbursed"))}
                category="reimbursedBills"
                field="uberLyftLimeReimbursed"
              />
              {/* Dynamic Subcategories */}
              {dynamicSubcategories.reimbursedBills.map((subcat) => (
                <DynamicSubcategoryRow
                  key={subcat.id}
                  subcategory={subcat}
                  categoryType="reimbursedBills"
                  onEditName={() => setEditSubcategoryModal({
                    open: true,
                    categoryType: "reimbursedBills",
                    metadataId: subcat.id,
                    currentName: subcat.name,
                    newName: subcat.name,
                  })}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${subcat.name}"?`)) {
                      deleteDynamicSubcategory("reimbursedBills", subcat.id);
                    }
                  }}
                  onUpdateValue={updateDynamicSubcategoryValue}
                  isReadOnly={isReadOnly}
                />
              ))}
              {/* Add Subcategory Button */}
              {!isReadOnly && (
                <tr>
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() => setAddSubcategoryModal({ open: true, categoryType: "reimbursedBills", name: "" })}
                      className="flex items-center gap-2 text-xs text-[#EAEB80] hover:text-[#d4d570] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subcategory
                    </button>
                  </td>
                </tr>
              )}
              <CategoryRow
                label="TOTAL REIMBURSE AND NON-REIMBURSE BILLS"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const fixedTotal = (
                    getMonthValue(data.reimbursedBills, monthNum, "electricReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "electricNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasServiceRun") +
                    getMonthValue(data.reimbursedBills, monthNum, "parkingAirport") +
                    getMonthValue(data.reimbursedBills, monthNum, "uberLyftLimeNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "uberLyftLimeReimbursed")
                  );
                  const dynamicTotal = dynamicSubcategories.reimbursedBills.reduce((sum, subcat) => {
                    const monthValue = subcat.values.find((v: any) => v.month === monthNum);
                    return sum + (monthValue?.value || 0);
                  }, 0);
                  return fixedTotal + dynamicTotal;
                })}
                isEditable={false}
                isTotal
              />
            </CategorySection>

            {/* HISTORY */}
            <CategorySection
              title="HISTORY"
              isExpanded={expandedSections.history}
              onToggle={() => toggleSection("history")}
            >
              <CategoryRow
                label="Days Rented"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "daysRented"))}
                category="history"
                field="daysRented"
                isEditable={true}
                isInteger
              />
              <CategoryRow
                label="Cars Available For Rent"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "carsAvailableForRent"))}
                category="history"
                field="carsAvailableForRent"
                isEditable={true}
                isInteger
              />
              <CategoryRow
                label="Trips Taken"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "tripsTaken"))}
                category="history"
                field="tripsTaken"
                isEditable={true}
                isInteger
              />
            </CategorySection>

            {/* CAR RENTAL VALUE PER MONTH */}
            <CategorySection
              title="CAR RENTAL VALUE PER MONTH"
              isExpanded={expandedSections.rentalValue}
              onToggle={() => toggleSection("rentalValue")}
              hasActions={false}
            >
              <CategoryRow
                label="Total Car Rental Income"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "rentalIncome"))}
                isEditable={false}
              />
              <CategoryRow
                label="Trips Taken"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "tripsTaken"))}
                isEditable={false}
                isInteger
              />
              <CategoryRow
                label="Ave Per Rental Per Trips Taken"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const rental = getMonthValue(data.incomeExpenses, monthNum, "rentalIncome");
                  const trips = getMonthValue(data.history, monthNum, "tripsTaken");
                  return trips > 0 ? rental / trips : 0;
                })}
                isEditable={false}
              />
            </CategorySection>

            {/* PARKING AIRPORT AVERAGE PER TRIP - GLA */}
            <CategorySection
              title="PARKING AIRPORT AVERAGE PER TRIP - GLA"
              isExpanded={expandedSections.parkingAverageGLA}
              onToggle={() => toggleSection("parkingAverageGLA")}
              hasActions={false}
            >
              <CategoryRow
                label="Total Trips Taken"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "tripsTaken"))}
                isEditable={false}
                isInteger
              />
              <CategoryRow
                label="Total Parking Airport"
                values={MONTHS.map((_, i) => getMonthValue(data.reimbursedBills, i + 1, "parkingAirport"))}
                isEditable={false}
              />
              <CategoryRow
                label="Average per trip"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const parking = getMonthValue(data.reimbursedBills, monthNum, "parkingAirport");
                  const trips = getMonthValue(data.history, monthNum, "tripsTaken");
                  return trips > 0 ? parking / trips : 0;
                })}
                isEditable={false}
              />
            </CategorySection>

            {/* PARKING AIRPORT AVERAGE PER TRIP - QB */}
            <CategorySection
              title="PARKING AIRPORT AVERAGE PER TRIP - QB"
              isExpanded={expandedSections.parkingAverageQB}
              onToggle={() => toggleSection("parkingAverageQB")}
              hasActions={false}
            >
              <CategoryRow
                label="Total Trips Taken"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "tripsTaken"))}
                isEditable={false}
                isInteger
              />
              <CategoryRow
                label="Total Parking Airport"
                values={MONTHS.map((_, i) => getMonthValue(data.parkingAirportQB || [], i + 1, "totalParkingAirport"))}
                category="parkingAirportQB"
                field="totalParkingAirport"
                isEditable={true}
              />
              <CategoryRow
                label="Average per trip"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const parking = getMonthValue(data.parkingAirportQB || [], monthNum, "totalParkingAirport");
                  const trips = getMonthValue(data.history, monthNum, "tripsTaken");
                  return trips > 0 ? parking / trips : 0;
                })}
                isEditable={false}
              />
            </CategorySection>
          </tbody>
        </table>
      </div>

      {/* Add Subcategory Modal */}
      <Dialog open={addSubcategoryModal.open} onOpenChange={(open) => setAddSubcategoryModal({ ...addSubcategoryModal, open })}>
        <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white">
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
            <DialogDescription>Enter a name for the new subcategory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subcategory Name</Label>
              <Input
                value={addSubcategoryModal.name}
                onChange={(e) => setAddSubcategoryModal({ ...addSubcategoryModal, name: e.target.value })}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSubcategoryModal({ open: false, categoryType: "", name: "" })}
              className="border-[#2a2a2a] text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (addSubcategoryModal.name.trim()) {
                  await addDynamicSubcategory(addSubcategoryModal.categoryType, addSubcategoryModal.name.trim());
                  setAddSubcategoryModal({ open: false, categoryType: "", name: "" });
                }
              }}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              disabled={!addSubcategoryModal.name.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Name Modal */}
      <Dialog open={editSubcategoryModal.open} onOpenChange={(open) => setEditSubcategoryModal({ ...editSubcategoryModal, open })}>
        <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white">
          <DialogHeader>
            <DialogTitle>Edit Subcategory Name</DialogTitle>
            <DialogDescription>Update the name of this subcategory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subcategory Name</Label>
              <Input
                value={editSubcategoryModal.newName}
                onChange={(e) => setEditSubcategoryModal({ ...editSubcategoryModal, newName: e.target.value })}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditSubcategoryModal({ open: false, categoryType: "", metadataId: 0, currentName: "", newName: "" })}
              className="border-[#2a2a2a] text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (editSubcategoryModal.newName.trim()) {
                  await updateDynamicSubcategoryName(
                    editSubcategoryModal.categoryType,
                    editSubcategoryModal.metadataId,
                    editSubcategoryModal.newName.trim()
                  );
                  setEditSubcategoryModal({ open: false, categoryType: "", metadataId: 0, currentName: "", newName: "" });
                }
              }}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              disabled={!editSubcategoryModal.newName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dynamic Subcategory Row Component
interface DynamicSubcategoryRowProps {
  subcategory: any;
  categoryType: string;
  onEditName: () => void;
  onDelete: () => void;
  onUpdateValue: (categoryType: string, metadataId: number, month: number, value: number, subcategoryName: string) => Promise<void>;
  isReadOnly?: boolean;
}

function DynamicSubcategoryRow({
  subcategory,
  categoryType,
  onEditName,
  onDelete,
  onUpdateValue,
  isReadOnly = false,
}: DynamicSubcategoryRowProps) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const { setEditingCell } = useIncomeExpense();
  
  const total = subcategory.values.reduce((sum: number, val: any) => sum + (val.value || 0), 0);
  
  const handleCellClick = (month: number, currentValue: number) => {
    if (isReadOnly) return;
    setEditingCell({
      category: `dynamic-${categoryType}`,
      field: `subcategory-${subcategory.id}`,
      month,
      value: currentValue,
    });
  };
  
  return (
    <tr className="border-b border-[#1a1a1a] hover:bg-[#151515]">
      <td className="sticky left-0 z-20 bg-[#0f0f0f] px-3 py-2 text-left text-gray-300 border-r border-[#1a1a1a] text-xs">
        <div className="flex items-center gap-2">
          <span>{subcategory.name}</span>
          {!isReadOnly && (
            <>
              <button
                onClick={onEditName}
                className="text-[#EAEB80] hover:text-[#d4d570] transition-colors"
                title="Edit name"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </td>
      {MONTHS.map((_, i) => {
        const month = i + 1;
        const monthValue = subcategory.values.find((v: any) => v.month === month);
        const value = monthValue?.value || 0;
        
        return (
          <td key={month} className="border-l border-[#1a1a1a] px-2 py-2 text-right">
            <span
              onClick={() => handleCellClick(month, value)}
              className={cn(
                "px-2 py-1 rounded block text-xs text-right transition-colors",
                isReadOnly 
                  ? "cursor-default" 
                  : "cursor-pointer hover:bg-[#2a2a2a]",
                value === 0 ? "text-gray-600" : "text-[#EAEB80]"
              )}
            >
              ${value.toFixed(2)}
            </span>
          </td>
        );
      })}
      <td className={cn(
        "sticky right-0 z-20 border-l border-[#2a2a2a] px-2 py-2 text-right font-bold text-xs bg-[#1f1f1f]",
        total === 0 ? "text-gray-600" : "text-[#EAEB80]"
      )}>
        ${total.toFixed(2)}
      </td>
    </tr>
  );
}

// Helper components
interface CategorySectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasActions?: boolean;
}

function CategorySection({ title, isExpanded, onToggle, children, hasActions = true }: CategorySectionProps) {
  return (
    <>
      <tr className="bg-[#1a1a1a] hover:bg-[#222]">
        <td colSpan={14} className="sticky left-0 z-30 bg-[#1a1a1a] hover:bg-[#222] px-3 py-2 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-xs font-semibold text-white">{title}</span>
          </div>
        </td>
      </tr>
      {isExpanded && children}
    </>
  );
}

interface CategoryRowProps {
  label: string;
  values: number[];
  percentageValues?: number[]; // For split rows, this stores the percentage
  category?: string;
  field?: string;
  isEditable?: boolean;
  isEditablePerMonth?: (month: number) => boolean; // Function to determine if a specific month is editable
  isInteger?: boolean;
  isTotal?: boolean;
  hideTotal?: boolean; // Hide the total column for this row
  formatType?: "managementSplit" | "ownerSplit";
  monthModes?: { [month: number]: 50 | 70 };
  isPercentage?: boolean;
  showAmountAndPercentage?: boolean; // Show both amount and percentage
}

function CategoryRow({
  label,
  values,
  percentageValues,
  category,
  field,
  isEditable = true,
  isEditablePerMonth,
  isInteger = false,
  isTotal = false,
  hideTotal = false,
  formatType,
  monthModes,
  isPercentage = false,
  showAmountAndPercentage = false,
}: CategoryRowProps) {
  const [location] = useLocation();
  const isReadOnly = location.startsWith("/admin/income-expenses");
  // Override isEditable if in read-only mode
  const effectiveIsEditable = isReadOnly ? false : isEditable;
  
  // Calculate total - ensure all values are numbers
  const total = values.reduce((sum, val) => {
    const numVal = typeof val === 'number' && !isNaN(val) ? val : 0;
    return sum + numVal;
  }, 0);

  // Helper to format value based on formatType
  const formatValue = (value: number, month: number) => {
    // For Negative Balance Carry Over, display in parentheses format for negative values
    // e.g., -3 => (3), -100 => (100), 0 => $0.00
    if (field === "negativeBalanceCarryOver") {
      if (value < 0) {
        return `(${Math.abs(value).toFixed(2)})`;
      }
      return `$${value.toFixed(2)}`;
    }
    
    if (showAmountAndPercentage && percentageValues) {
      // Show both calculated amount and percentage
      const percentage = percentageValues[month - 1] || 0;
      return `$${value.toFixed(2)} (${percentage.toFixed(0)}%)`;
    } else if (isPercentage) {
      // Format as percentage: 50%
      return `${value.toFixed(0)}%`;
    } else if (formatType === "managementSplit") {
      // Get mode for this month to determine percentage
      const mode = monthModes?.[month] || 50;
      const percentage = mode === 70 ? 30 : 50; // 30:70 split when mode is 70 (Car Management : Car Owner)
      // Format: $ {splitAmount.toFixed(2)}({percentage}%)
      return `$ ${value.toFixed(2)}(${percentage}%)`;
    } else if (formatType === "ownerSplit") {
      // Format: $ {splitAmount.toFixed(2)}
      return `$ ${value.toFixed(2)}`;
    } else if (isInteger) {
      return value.toString();
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  // Format total based on formatType
  // For all currency values, format as: $ {total.toFixed(2)}
  const formatTotal = () => {
    if (showAmountAndPercentage && percentageValues) {
      // Show both total amount and average percentage
      const avgPercentage = percentageValues.reduce((sum, val) => sum + (val || 0), 0) / 12;
      return `$${total.toFixed(2)} (${avgPercentage.toFixed(0)}%)`;
    } else if (isPercentage) {
      // For percentages, show average
      const avg = total / 12;
      return `${avg.toFixed(0)}%`;
    } else if (formatType === "managementSplit") {
      // For management split, calculate average percentage or use default
      const avgMode = monthModes 
        ? Object.values(monthModes).reduce((sum, mode) => sum + (mode === 70 ? 30 : 50), 0) / 12 // 30:70 split when mode is 70
        : 50;
      return `$ ${total.toFixed(2)}(${Math.round(avgMode)}%)`;
    } else if (formatType === "ownerSplit") {
      // Owner split: $ {total.toFixed(2)}
      return `$ ${total.toFixed(2)}`;
    } else if (isInteger) {
      // Integer values (like trips, days): just the number
      return total.toString();
    } else {
      // All other currency values: $ {total.toFixed(2)}
      return `$ ${total.toFixed(2)}`;
    }
  };

  return (
    <tr className={cn(
      "border-b border-[#1a1a1a] hover:bg-[#151515]",
      isTotal && "bg-[#0a0a0a] font-semibold"
    )}>
      <td className="sticky left-0 z-20 bg-[#0f0f0f] px-3 py-2 text-left text-gray-300 border-r border-[#1a1a1a] text-xs">
        {label}
      </td>
      {values.map((value, i) => {
        const month = i + 1;
        // Ensure value is a number and handle null/undefined
        const cellValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        // Determine if this specific month is editable
        const isMonthEditable = isReadOnly ? false : (isEditablePerMonth ? isEditablePerMonth(month) : effectiveIsEditable);
        
        return (
          <td 
            key={month} 
            className="border-l border-[#1a1a1a] px-2 py-2 text-right"
          >
            {category && field && isMonthEditable ? (
              showAmountAndPercentage && percentageValues ? (
                // For split rows, edit the percentage value
                <>
                  <div className="text-xs text-right">
                    <span className={cn(cellValue === 0 && "text-gray-600")}>
                      ${cellValue.toFixed(2)}
                    </span>
                  </div>
                  <EditableCell
                    value={percentageValues[month - 1] || 0}
                    month={month}
                    category={category}
                    field={field}
                    isEditable={effectiveIsEditable}
                    isInteger={false}
                    isPercentage={true}
                  />
                </>
              ) : (
                <EditableCell
                  value={cellValue}
                  month={month}
                  category={category}
                  field={field}
                  isEditable={effectiveIsEditable}
                  isInteger={isInteger}
                  isPercentage={isPercentage}
                />
              )
            ) : (
              <span className={cn("text-xs text-right block", cellValue === 0 && "text-gray-600")}>
                {formatValue(cellValue, month)}
              </span>
            )}
          </td>
        );
      })}
      {!hideTotal && (
        <td className={cn(
          "sticky right-0 z-20 border-l border-[#2a2a2a] px-2 py-2 text-right text-white font-bold text-xs",
          isTotal ? "bg-[#0a0a0a]" : "bg-[#1f1f1f]"
        )}>
          {formatTotal()}
        </td>
      )}
    </tr>
  );
}
