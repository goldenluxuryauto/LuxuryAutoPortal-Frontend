import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useIncomeExpense } from "../context/IncomeExpenseContext";
import EditableCell from "./EditableCell";
import { cn } from "@/lib/utils";

interface IncomeExpenseTableProps {
  year: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function IncomeExpenseTable({ year }: IncomeExpenseTableProps) {
  const { data, monthModes, toggleMonthMode, isSavingMode } = useIncomeExpense();

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

  // Helper function to get split for a specific month
  const getSplitForMonth = (month: number) => {
    const mode = monthModes[month];
    if (mode === 70) {
      return { mgmt: 30, owner: 70 }; // 70 mode = 30:70 split
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
                const currentMode = monthModes[monthNum] || 50;
                return (
                  <th
                    key={month}
                    className="border-l border-[#2a2a2a] px-2 py-2 text-center min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white text-xs">{month} {year}</span>
                      <button
                        onClick={() => toggleMonthMode(monthNum)}
                        disabled={isSavingMode}
                        className={cn(
                          "px-3 py-0.5 rounded-full text-xs font-semibold transition-all duration-200",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          currentMode === 50 
                            ? "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-lg shadow-green-600/50" 
                            : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-600/50",
                          isSavingMode && "animate-pulse"
                        )}
                        title={isSavingMode ? "Saving mode change..." : `Click to toggle between 50:50 (green) and 30:70 (blue) split`}
                      >
                        {isSavingMode ? "..." : currentMode}
                      </button>
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
              {/* Car Management Split - Reactive to income changes and mode toggles */}
              <CategoryRow
                label="Car Management Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  // Calculate total income for the month (sum of all income items)
                  // This recalculates automatically when data.incomeExpenses changes
                  const totalIncome = getTotalIncomeForMonth(monthNum);
                  // Get mode for this month (50 or 70) - reactive to monthModes state changes
                  const mode = monthModes[monthNum] || 50;
                  // Calculate split amount based on mode
                  // Mode 50: splitAmount = totalIncome × 0.50, percentage = 50
                  // Mode 70: splitAmount = totalIncome × 0.30, percentage = 30
                  const splitAmount = mode === 70 
                    ? totalIncome * 0.30 
                    : totalIncome * 0.50;
                  return splitAmount;
                })}
                category="managementSplit"
                field="carManagementSplit"
                isEditable={false}
                formatType="managementSplit"
                monthModes={monthModes}
              />
              {/* Car Owner Split - Reactive to income changes and mode toggles */}
              <CategoryRow
                label="Car Owner Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  // Calculate total income for the month (sum of all income items)
                  // This recalculates automatically when data.incomeExpenses changes
                  const totalIncome = getTotalIncomeForMonth(monthNum);
                  // Get mode for this month (50 or 70) - reactive to monthModes state changes
                  const mode = monthModes[monthNum] || 50;
                  // Calculate split amount based on mode
                  // Mode 50: splitAmount = totalIncome × 0.50
                  // Mode 70: splitAmount = totalIncome × 0.70
                  const splitAmount = mode === 70 
                    ? totalIncome * 0.70 
                    : totalIncome * 0.50;
                  return splitAmount;
                })}
                category="managementSplit"
                field="carOwnerSplit"
                isEditable={false}
                formatType="ownerSplit"
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
                label="Insurance Wreck Income"
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
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "negativeBalanceCarryOver"))}
                category="income"
                field="negativeBalanceCarryOver"
              />
              <CategoryRow
                label="Car Payment"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "carPayment"))}
                category="income"
                field="carPayment"
              />
              <CategoryRow
                label="Car Management Total Expenses"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "carManagementTotalExpenses"))}
                category="income"
                field="carManagementTotalExpenses"
              />
              <CategoryRow
                label="Car Owner Total Expenses"
                values={MONTHS.map((_, i) => getMonthValue(data.incomeExpenses, i + 1, "carOwnerTotalExpenses"))}
                category="income"
                field="carOwnerTotalExpenses"
              />
              <CategoryRow
                label="Total Expenses"
                values={MONTHS.map((_, i) => {
                  const mgmt = getMonthValue(data.incomeExpenses, i + 1, "carManagementTotalExpenses");
                  const owner = getMonthValue(data.incomeExpenses, i + 1, "carOwnerTotalExpenses");
                  return mgmt + owner;
                })}
                isEditable={false}
              />
              <CategoryRow
                label="Total Car Profit"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const rental = getMonthValue(data.incomeExpenses, monthNum, "rentalIncome");
                  const delivery = getMonthValue(data.incomeExpenses, monthNum, "deliveryIncome");
                  const electric = getMonthValue(data.incomeExpenses, monthNum, "electricPrepaidIncome");
                  const smoking = getMonthValue(data.incomeExpenses, monthNum, "smokingFines");
                  const gas = getMonthValue(data.incomeExpenses, monthNum, "gasPrepaidIncome");
                  const skiRacks = getMonthValue(data.incomeExpenses, monthNum, "skiRacksIncome");
                  const miles = getMonthValue(data.incomeExpenses, monthNum, "milesIncome");
                  const childSeat = getMonthValue(data.incomeExpenses, monthNum, "childSeatIncome");
                  const coolers = getMonthValue(data.incomeExpenses, monthNum, "coolersIncome");
                  const insurance = getMonthValue(data.incomeExpenses, monthNum, "insuranceWreckIncome");
                  const other = getMonthValue(data.incomeExpenses, monthNum, "otherIncome");
                  const mgmt = getMonthValue(data.incomeExpenses, monthNum, "carManagementTotalExpenses");
                  const owner = getMonthValue(data.incomeExpenses, monthNum, "carOwnerTotalExpenses");
                  const totalIncome = rental + delivery + electric + smoking + gas + skiRacks + miles + childSeat + coolers + insurance + other;
                  const totalExpenses = mgmt + owner;
                  return totalIncome - totalExpenses;
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
                label="Labor - Car Cleaning"
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
              <CategoryRow
                label="TOTAL OPERATING EXPENSE (Direct Delivery)"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return (
                    getMonthValue(data.directDelivery, monthNum, "laborCarCleaning") +
                    getMonthValue(data.directDelivery, monthNum, "laborDelivery") +
                    getMonthValue(data.directDelivery, monthNum, "parkingAirport") +
                    getMonthValue(data.directDelivery, monthNum, "parkingLot") +
                    getMonthValue(data.directDelivery, monthNum, "uberLyftLime")
                  );
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
                label="Tickets"
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
              <CategoryRow
                label="TOTAL OPERATING EXPENSE (COGS - Per Vehicle)"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return (
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
              <CategoryRow
                label="Total Parking Fee & Labor Cleaning"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return (
                    getMonthValue(data.parkingFeeLabor, monthNum, "glaParkingFee") +
                    getMonthValue(data.parkingFeeLabor, monthNum, "laborCleaning")
                  );
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
              <CategoryRow
                label="TOTAL REIMBURSE AND NON-REIMBURSE BILLS"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  return (
                    getMonthValue(data.reimbursedBills, monthNum, "electricReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "electricNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "gasServiceRun") +
                    getMonthValue(data.reimbursedBills, monthNum, "parkingAirport") +
                    getMonthValue(data.reimbursedBills, monthNum, "uberLyftLimeNotReimbursed") +
                    getMonthValue(data.reimbursedBills, monthNum, "uberLyftLimeReimbursed")
                  );
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
                isInteger
              />
              <CategoryRow
                label="Cars Available For Rent"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "carsAvailableForRent"))}
                category="history"
                field="carsAvailableForRent"
                isInteger
              />
              <CategoryRow
                label="Trips Taken"
                values={MONTHS.map((_, i) => getMonthValue(data.history, i + 1, "tripsTaken"))}
                category="history"
                field="tripsTaken"
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
                values={MONTHS.map((_, i) => getMonthValue(data.directDelivery, i + 1, "parkingAirport"))}
                isEditable={false}
              />
              <CategoryRow
                label="Average per trip"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const parking = getMonthValue(data.directDelivery, monthNum, "parkingAirport");
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper components
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
  category?: string;
  field?: string;
  isEditable?: boolean;
  isInteger?: boolean;
  isTotal?: boolean;
  formatType?: "managementSplit" | "ownerSplit";
  monthModes?: { [month: number]: 50 | 70 };
}

function CategoryRow({
  label,
  values,
  category,
  field,
  isEditable = true,
  isInteger = false,
  isTotal = false,
  formatType,
  monthModes,
}: CategoryRowProps) {
  // Calculate total - ensure all values are numbers
  const total = values.reduce((sum, val) => {
    const numVal = typeof val === 'number' && !isNaN(val) ? val : 0;
    return sum + numVal;
  }, 0);

  // Helper to format value based on formatType
  const formatValue = (value: number, month: number) => {
    if (formatType === "managementSplit") {
      // Get mode for this month to determine percentage
      const mode = monthModes?.[month] || 50;
      const percentage = mode === 70 ? 30 : 50;
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
    if (formatType === "managementSplit") {
      // For management split, calculate average percentage or use default
      const avgMode = monthModes 
        ? Object.values(monthModes).reduce((sum, mode) => sum + (mode === 70 ? 30 : 50), 0) / 12
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
        
        return (
          <td 
            key={month} 
            className="border-l border-[#1a1a1a] px-2 py-2 text-right"
          >
            {category && field && isEditable ? (
              <EditableCell
                value={cellValue}
                month={month}
                category={category}
                field={field}
                isEditable={isEditable}
                isInteger={isInteger}
              />
            ) : (
              <span className={cn("text-xs text-right block", cellValue === 0 && "text-gray-600")}>
                {formatValue(cellValue, month)}
              </span>
            )}
          </td>
        );
      })}
      <td className={cn(
        "sticky right-0 z-20 border-l border-[#2a2a2a] px-2 py-2 text-right text-white font-bold text-xs",
        isTotal ? "bg-[#0a0a0a]" : "bg-[#1f1f1f]"
      )}>
        {formatTotal()}
      </td>
    </tr>
  );
}
