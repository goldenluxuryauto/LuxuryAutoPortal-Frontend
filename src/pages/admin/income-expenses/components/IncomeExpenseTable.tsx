import React, { useState } from "react";
import { ChevronDown, ChevronRight, Download, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIncomeExpense } from "../context/IncomeExpenseContext";
import EditableCell from "./EditableCell";
import { cn } from "@/lib/utils";

interface IncomeExpenseTableProps {
  year: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function IncomeExpenseTable({ year }: IncomeExpenseTableProps) {
  const { data, monthModes, toggleMonthMode } = useIncomeExpense();

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

  // Helper to get value by month
  const getMonthValue = (arr: any[], month: number, field: string): number => {
    const item = arr.find((x) => x.month === month);
    return item ? Number(item[field] || 0) : 0;
  };

  // Get split percentages based on default setting
  const defaultMgmtSplit = data.formulaSetting?.carManagementSplitPercent || 50;
  const defaultOwnerSplit = data.formulaSetting?.carOwnerSplitPercent || 50;
  
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
                const currentMode = monthModes[monthNum];
                return (
                  <th
                    key={month}
                    className="border-l border-[#2a2a2a] px-2 py-2 text-center min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white text-xs">{month} {year}</span>
                      <button
                        onClick={() => toggleMonthMode(monthNum)}
                        className={cn(
                          "px-3 py-0.5 rounded-full text-xs font-semibold transition-colors",
                          currentMode === 50 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        {currentMode}
                      </button>
                    </div>
                  </th>
                );
              })}
              <th className="border-l border-[#2a2a2a] px-2 py-2 text-center text-white min-w-[80px] bg-[#1f1f1f]">
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
              hasActions={true}
              hasImport={false}
            >
              <CategoryRow
                label="Car Management Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const rental = getMonthValue(data.incomeExpenses, monthNum, "rentalIncome");
                  const skiRacks = getMonthValue(data.incomeExpenses, monthNum, "skiRacksIncome");
                  const split = getSplitForMonth(monthNum);
                  return (rental + skiRacks) * (split.mgmt / 100);
                })}
                category="managementSplit"
                field="carManagementSplit"
                isEditable={true}
              />
              <CategoryRow
                label="Car Owner Split"
                values={MONTHS.map((_, i) => {
                  const monthNum = i + 1;
                  const rental = getMonthValue(data.incomeExpenses, monthNum, "rentalIncome");
                  const skiRacks = getMonthValue(data.incomeExpenses, monthNum, "skiRacksIncome");
                  const split = getSplitForMonth(monthNum);
                  return (rental + skiRacks) * (split.owner / 100);
                })}
                category="managementSplit"
                field="carOwnerSplit"
                isEditable={true}
              />
            </CategorySection>

            {/* INCOME & EXPENSES */}
            <CategorySection
              title="INCOME & EXPENSES"
              isExpanded={expandedSections.incomeExpenses}
              onToggle={() => toggleSection("incomeExpenses")}
              hasActions={true}
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
              hasActions={true}
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
              hasActions={true}
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
              hasActions={true}
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
              hasActions={true}
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
              hasActions={true}
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
  hasActions?: boolean;
  hasImport?: boolean;
}

function CategorySection({ title, isExpanded, onToggle, children, hasActions = false, hasImport = true }: CategorySectionProps) {
  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Export", title);
    // Export logic here
  };

  const handleImport = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Import", title);
    // Import logic here
  };

  const handleLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Log", title);
    // Log logic here
  };

  return (
    <>
      <tr className="bg-[#1a1a1a] hover:bg-[#222]">
        <td colSpan={14} className="sticky left-0 z-30 bg-[#1a1a1a] hover:bg-[#222] px-3 py-2 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={onToggle}>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-xs font-semibold text-white">{title}</span>
            </div>
            {hasActions && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExport}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                {hasImport && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleImport}
                    className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Import
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLog}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Log
                </Button>
              </div>
            )}
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
}

function CategoryRow({
  label,
  values,
  category,
  field,
  isEditable = true,
  isInteger = false,
  isTotal = false,
}: CategoryRowProps) {
  const total = values.reduce((sum, val) => sum + val, 0);

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
        
        return (
          <td 
            key={month} 
            className="border-l border-[#1a1a1a] px-2 py-2 text-right"
          >
            {category && field && isEditable ? (
              <EditableCell
                value={value}
                month={month}
                category={category}
                field={field}
                isEditable={isEditable}
                isInteger={isInteger}
              />
            ) : (
              <span className={cn("text-xs text-right block", value === 0 && "text-gray-600")}>
                {isInteger ? value.toString() : `$${value.toFixed(2)}`}
              </span>
            )}
          </td>
        );
      })}
      <td className="border-l border-[#2a2a2a] px-2 py-2 text-right bg-[#1f1f1f] text-white font-semibold text-xs">
        {isInteger ? total.toString() : `$${total.toFixed(2)}`}
      </td>
    </tr>
  );
}
