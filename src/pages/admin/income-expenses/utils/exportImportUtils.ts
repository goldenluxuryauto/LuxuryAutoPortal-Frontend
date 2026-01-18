// Consolidated Export/Import utility functions for Income and Expenses
import type { IncomeExpenseData } from "../types";

/**
 * Export all income and expense data to CSV format
 * Includes all categories in a single file with proper sections
 */
export function exportAllIncomeExpenseData(
  data: IncomeExpenseData,
  carInfo: any,
  year: string,
  monthModes: { [month: number]: 50 | 70 },
  dynamicSubcategories?: {
    directDelivery: any[];
    cogs: any[];
    parkingFeeLabor: any[];
    reimbursedBills: any[];
  }
): void {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Helper functions to calculate values
  const getMonthValue = (arr: any[], month: number, field: string): number => {
    const monthData = arr[month - 1];
    return Number(monthData?.[field]) || 0;
  };
  
  const getTotalDirectDeliveryForMonth = (month: number): number => {
    const fixedTotal = (
      getMonthValue(data.directDelivery, month, "laborCarCleaning") +
      getMonthValue(data.directDelivery, month, "laborDelivery") +
      getMonthValue(data.directDelivery, month, "parkingAirport") +
      getMonthValue(data.directDelivery, month, "parkingLot") +
      getMonthValue(data.directDelivery, month, "uberLyftLime")
    );
    const dynamicTotal = (dynamicSubcategories?.directDelivery || []).reduce((sum: number, subcat: any) => {
      const monthValue = subcat.values?.find((v: any) => v.month === month);
      return sum + (Number(monthValue?.value) || 0);
    }, 0);
    return Number(fixedTotal) + Number(dynamicTotal);
  };
  
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
    const dynamicTotal = (dynamicSubcategories?.cogs || []).reduce((sum: number, subcat: any) => {
      const monthValue = subcat.values?.find((v: any) => v.month === month);
      return sum + (Number(monthValue?.value) || 0);
    }, 0);
    return Number(fixedTotal) + Number(dynamicTotal);
  };
  
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
    const dynamicTotal = (dynamicSubcategories?.reimbursedBills || []).reduce((sum: number, subcat: any) => {
      const monthValue = subcat.values?.find((v: any) => v.month === month);
      return sum + (Number(monthValue?.value) || 0);
    }, 0);
    return Number(fixedTotal) + Number(dynamicTotal);
  };
  
  const calculateCarManagementSplit = (month: number): number => {
    const storedPercent = Number(getMonthValue(data.incomeExpenses, month, "carManagementSplit")) || 0;
    const mgmtPercent = storedPercent / 100;
    
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
    const negativeBalanceCarryOver = getMonthValue(data.incomeExpenses, month, "negativeBalanceCarryOver");
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    const totalReimbursedBills = getTotalReimbursedBillsForMonth(month);
    
    const part1 = deliveryIncome + electricPrepaidIncome + gasPrepaidIncome + skiRacksIncome + 
                  (smokingFines * 0.90 + childSeatIncome * mgmtPercent + coolersIncome * mgmtPercent + 
                   insuranceWreckIncome * mgmtPercent + otherIncome * mgmtPercent);
    
    const part2 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                   gasPrepaidIncome - smokingFines - milesIncome - skiRacksIncome - childSeatIncome - 
                   coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs) * mgmtPercent;
    
    const calculation = Number(part1) - Number(totalReimbursedBills) + Number(part2);
    
    return Number(calculation) >= 0 ? Number(calculation) : 0;
  };
  
  const calculateCarOwnerSplit = (month: number): number => {
    const storedPercent = Number(getMonthValue(data.incomeExpenses, month, "carOwnerSplit")) || 0;
    const ownerPercent = storedPercent / 100;
    
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
    const negativeBalanceCarryOver = getMonthValue(data.incomeExpenses, month, "negativeBalanceCarryOver");
    const totalDirectDelivery = getTotalDirectDeliveryForMonth(month);
    const totalCogs = getTotalCogsForMonth(month);
    
    const part1 = milesIncome;
    const part2 = smokingFines * 0.10 + childSeatIncome * ownerPercent + coolersIncome * ownerPercent + 
                  insuranceWreckIncome * ownerPercent + otherIncome * ownerPercent;
    const part3 = (rentalIncome + negativeBalanceCarryOver - deliveryIncome - electricPrepaidIncome - 
                   smokingFines - gasPrepaidIncome - milesIncome - skiRacksIncome - childSeatIncome - 
                   coolersIncome - insuranceWreckIncome - otherIncome - totalDirectDelivery - totalCogs) * ownerPercent;
    
    const calculation = Number(part1) + Number(part2) + Number(part3);
    
    return Number(calculation) >= 0 ? Number(calculation) : 0;
  };
  
  const calculateNegativeBalanceCarryOver = (month: number): number => {
    if (month === 1) {
      // January uses the stored value (manually entered)
      const storedValue = Number(getMonthValue(data.incomeExpenses, 1, "negativeBalanceCarryOver")) || 0;
      return Math.abs(storedValue);
    }
    
    const prevMonth = month - 1;
    const prevRentalIncome = getMonthValue(data.incomeExpenses, prevMonth, "rentalIncome");
    const prevDeliveryIncome = getMonthValue(data.incomeExpenses, prevMonth, "deliveryIncome");
    const prevElectricPrepaidIncome = getMonthValue(data.incomeExpenses, prevMonth, "electricPrepaidIncome");
    const prevSmokingFines = getMonthValue(data.incomeExpenses, prevMonth, "smokingFines");
    const prevGasPrepaidIncome = getMonthValue(data.incomeExpenses, prevMonth, "gasPrepaidIncome");
    const prevSkiRacksIncome = getMonthValue(data.incomeExpenses, prevMonth, "skiRacksIncome");
    const prevMilesIncome = getMonthValue(data.incomeExpenses, prevMonth, "milesIncome");
    const prevChildSeatIncome = getMonthValue(data.incomeExpenses, prevMonth, "childSeatIncome");
    const prevCoolersIncome = getMonthValue(data.incomeExpenses, prevMonth, "coolersIncome");
    const prevInsuranceWreckIncome = getMonthValue(data.incomeExpenses, prevMonth, "insuranceWreckIncome");
    const prevOtherIncome = getMonthValue(data.incomeExpenses, prevMonth, "otherIncome");
    // Use the calculated value from previous month (recursive call)
    const prevNegativeBalanceCarryOver = calculateNegativeBalanceCarryOver(prevMonth);
    const prevTotalDirectDelivery = getTotalDirectDeliveryForMonth(prevMonth);
    const prevTotalCogs = getTotalCogsForMonth(prevMonth);
    
    const calculation = Number(prevRentalIncome) - Number(prevDeliveryIncome) - Number(prevElectricPrepaidIncome) - 
                       Number(prevGasPrepaidIncome) - Number(prevMilesIncome) - Number(prevSkiRacksIncome) - 
                       Number(prevChildSeatIncome) - Number(prevCoolersIncome) - Number(prevInsuranceWreckIncome) - 
                       Number(prevOtherIncome) - Number(prevTotalDirectDelivery) - Number(prevTotalCogs) - Number(prevNegativeBalanceCarryOver);
    
    // Return absolute value (remove negative sign)
    const result = Number(calculation) > 0 ? 0 : Number(calculation);
    return Math.abs(result);
  };
  
  const calculateCarPayment = (month: number): number => {
    return getMonthValue(data.cogs, month, "carPayment");
  };
  
  const calculateCarManagementTotalExpenses = (month: number): number => {
    // "TOTAL REIMBURSE AND NON-REIMBURSE BILLS" + ("TOTAL OPERATING EXPENSE (Direct Delivery)" * "Car Management Split %") + ("TOTAL OPERATING EXPENSE (COGS - Per Vehicle)" * "Car Management Split %")
    const storedMgmtPercent = Number(getMonthValue(data.incomeExpenses, month, "carManagementSplit")) || 0;
    const mgmtPercent = storedMgmtPercent / 100; // Convert percentage to decimal
    const totalDirectDelivery = Number(getTotalDirectDeliveryForMonth(month)) || 0;
    const totalCogs = Number(getTotalCogsForMonth(month)) || 0;
    const totalReimbursedBills = Number(getTotalReimbursedBillsForMonth(month)) || 0;
    
    return Number(totalReimbursedBills) + (Number(totalDirectDelivery) * mgmtPercent) + (Number(totalCogs) * mgmtPercent);
  };
  
  const calculateCarOwnerTotalExpenses = (month: number): number => {
    // ("TOTAL OPERATING EXPENSE (Direct Delivery)" * "Car Owner Split %") + ("TOTAL OPERATING EXPENSE (COGS - Per Vehicle)" * "Car Owner Split %")
    const storedOwnerPercent = Number(getMonthValue(data.incomeExpenses, month, "carOwnerSplit")) || 0;
    const ownerPercent = storedOwnerPercent / 100; // Convert percentage to decimal
    const totalDirectDelivery = Number(getTotalDirectDeliveryForMonth(month)) || 0;
    const totalCogs = Number(getTotalCogsForMonth(month)) || 0;
    
    return (Number(totalDirectDelivery) * ownerPercent) + (Number(totalCogs) * ownerPercent);
  };
  
  let csvContent = "";
  
  // ========================================
  // HEADER: Car and Owner Information
  // ========================================
  csvContent += `CAR NAME,${carInfo?.makeModel || carInfo?.make + ' ' + carInfo?.model || 'N/A'}\n`;
  csvContent += `VIN #,${carInfo?.vin || 'N/A'}\n`;
  csvContent += `LICENSE,${carInfo?.licensePlate || 'N/A'}\n`;
  csvContent += `OWNER NAME,${carInfo?.owner?.firstName || ''} ${carInfo?.owner?.lastName || ''}\n`;
  csvContent += `CONTACT #,${carInfo?.owner?.phone || 'N/A'}\n`;
  csvContent += `EMAIL,${carInfo?.owner?.email || 'N/A'}\n`;
  csvContent += `FUEL/GAS,${carInfo?.fuelGas || 'N/A'}\n`;
  csvContent += `TIRE SIZE,${carInfo?.tireSize || 'N/A'}\n`;
  csvContent += `OIL TYPE,${carInfo?.oilType || 'N/A'}\n`;
  csvContent += `TURO LINK,${carInfo?.turoLink || 'N/A'}\n`;
  csvContent += `ADMIN TURO LINK,${carInfo?.adminTuroLink || 'N/A'}\n`;
  csvContent += `\n`;
  
  // ========================================
  // SECTION 1: CAR MANAGEMENT OWNER SPLIT
  // ========================================
  csvContent += `SECTION,CAR MANAGEMENT OWNER SPLIT\n`;
  csvContent += `Mode Settings,`;
  MONTHS.forEach((month, idx) => {
    csvContent += `${month} ${year}: ${monthModes[idx + 1] || 50},`;
  });
  csvContent += `\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  // Car Management Split row (calculated with percentage)
  csvContent += `Car Management Split,`;
  let mgmtSplitTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const calculatedAmount = Number(calculateCarManagementSplit(monthNum)) || 0;
    const percentage = Number(getMonthValue(data.incomeExpenses, monthNum, "carManagementSplit")) || 0;
    csvContent += `$${calculatedAmount.toFixed(2)} (${percentage.toFixed(0)}%),`;
    mgmtSplitTotal += calculatedAmount;
  });
  csvContent += `$0.00,$0.00,$${mgmtSplitTotal.toFixed(2)}\n`;
  
  // Car Owner Split row (calculated with percentage)
  csvContent += `Car Owner Split,`;
  let ownerSplitTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const calculatedAmount = Number(calculateCarOwnerSplit(monthNum)) || 0;
    const percentage = Number(getMonthValue(data.incomeExpenses, monthNum, "carOwnerSplit")) || 0;
    csvContent += `$${calculatedAmount.toFixed(2)} (${percentage.toFixed(0)}%),`;
    ownerSplitTotal += calculatedAmount;
  });
  csvContent += `$0.00,$0.00,$${ownerSplitTotal.toFixed(2)}\n\n`;
  
  // ========================================
  // SECTION 2: INCOME & EXPENSES
  // ========================================
  csvContent += `SECTION,INCOME & EXPENSES\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  const incomeFields = [
    { field: 'rentalIncome', label: 'Rental Income' },
    { field: 'deliveryIncome', label: 'Delivery Income' },
    { field: 'electricPrepaidIncome', label: 'Electric Prepaid Income' },
    { field: 'smokingFines', label: 'Smoking Fines' },
    { field: 'gasPrepaidIncome', label: 'Gas Prepaid Income' },
    { field: 'skiRacksIncome', label: 'Ski Racks Income' },
    { field: 'milesIncome', label: 'Miles Income' },
    { field: 'childSeatIncome', label: 'Child Seat Income' },
    { field: 'coolersIncome', label: 'Coolers Income' },
    { field: 'insuranceWreckIncome', label: 'Income insurance and Client Wrecks' },
    { field: 'otherIncome', label: 'Other Income' },
  ];
  
  incomeFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.incomeExpenses[idx] as any)?.[field] || 0;
      csvContent += `$${Number(value).toFixed(2)},`;
      total += Number(value);
    });
    csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
  });
  
  // Formula categories - Negative Balance Carry Over
  csvContent += `Negative Balance Carry Over,`;
  let negativeBalanceTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(calculateNegativeBalanceCarryOver(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    negativeBalanceTotal += value;
  });
  csvContent += `$0.00,$0.00,$${negativeBalanceTotal.toFixed(2)}\n`;
  
  // Formula category - Car Payment (from COGS)
  csvContent += `Car Payment,`;
  let carPaymentTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(calculateCarPayment(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    carPaymentTotal += value;
  });
  csvContent += `$0.00,$0.00,$${carPaymentTotal.toFixed(2)}\n`;
  
  // Formula category - Car Management Total Expenses
  csvContent += `Car Management Total Expenses,`;
  let mgmtExpensesTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(calculateCarManagementTotalExpenses(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    mgmtExpensesTotal += value;
  });
  csvContent += `$0.00,$0.00,$${mgmtExpensesTotal.toFixed(2)}\n`;
  
  // Formula category - Car Owner Total Expenses
  csvContent += `Car Owner Total Expenses,`;
  let ownerExpensesTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(calculateCarOwnerTotalExpenses(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    ownerExpensesTotal += value;
  });
  csvContent += `$0.00,$0.00,$${ownerExpensesTotal.toFixed(2)}\n`;
  
  // Formula category - Total Expenses
  csvContent += `Total Expenses,`;
  let totalExpensesTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const mgmt = Number(calculateCarManagementTotalExpenses(monthNum)) || 0;
    const owner = Number(calculateCarOwnerTotalExpenses(monthNum)) || 0;
    const value = mgmt + owner;
    csvContent += `$${value.toFixed(2)},`;
    totalExpensesTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalExpensesTotal.toFixed(2)}\n`;
  
  // Formula category - Total Car Profit
  csvContent += `Total Car Profit,`;
  let totalProfitTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const rentalIncome = Number(getMonthValue(data.incomeExpenses, monthNum, "rentalIncome")) || 0;
    const mgmt = Number(calculateCarManagementTotalExpenses(monthNum)) || 0;
    const owner = Number(calculateCarOwnerTotalExpenses(monthNum)) || 0;
    const totalExpenses = mgmt + owner;
    const value = rentalIncome - totalExpenses;
    csvContent += `$${value.toFixed(2)},`;
    totalProfitTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalProfitTotal.toFixed(2)}\n`;
  csvContent += `\n`;
  
  // ========================================
  // SECTION 3: OPERATING EXPENSE (Direct Delivery)
  // ========================================
  csvContent += `SECTION,OPERATING EXPENSE (Direct Delivery)\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  const directDeliveryFields = [
    { field: 'laborCarCleaning', label: 'Labor - Detailing' },
    { field: 'laborDelivery', label: 'Labor - Delivery' },
    { field: 'parkingAirport', label: 'Parking - Airport' },
    { field: 'parkingLot', label: 'Parking - Lot' },
    { field: 'uberLyftLime', label: 'Uber/Lyft/Lime' },
  ];
  
  directDeliveryFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.directDelivery[idx] as any)?.[field] || 0;
      csvContent += `$${Number(value).toFixed(2)},`;
      total += Number(value);
    });
    csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
  });
  
  // Export dynamic subcategories for Direct Delivery
  if (dynamicSubcategories?.directDelivery) {
    dynamicSubcategories.directDelivery.forEach((subcat) => {
      csvContent += `${subcat.name},`;
      let total = 0;
      MONTHS.forEach((_, idx) => {
        const monthValue = subcat.values.find((v: any) => v.month === idx + 1);
        const value = monthValue?.value || 0;
        csvContent += `$${Number(value).toFixed(2)},`;
        total += Number(value);
      });
      csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
    });
  }
  
  // Formula category - TOTAL OPERATING EXPENSE (Direct Delivery)
  csvContent += `TOTAL OPERATING EXPENSE (Direct Delivery),`;
  let totalDirectDeliveryTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getTotalDirectDeliveryForMonth(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    totalDirectDeliveryTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalDirectDeliveryTotal.toFixed(2)}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 4: OPERATING EXPENSE (COGS - Per Vehicle)
  // ========================================
  csvContent += `SECTION,OPERATING EXPENSE (COGS - Per Vehicle)\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  const cogsFields = [
    { field: 'autoBodyShopWreck', label: 'Auto Body Shop / Wreck' },
    { field: 'alignment', label: 'Alignment' },
    { field: 'battery', label: 'Battery' },
    { field: 'brakes', label: 'Brakes' },
    { field: 'carPayment', label: 'Car Payment' },
    { field: 'carInsurance', label: 'Car Insurance' },
    { field: 'carSeats', label: 'Car Seats' },
    { field: 'cleaningSuppliesTools', label: 'Cleaning Supplies / Tools' },
    { field: 'emissions', label: 'Emissions' },
    { field: 'gpsSystem', label: 'GPS System' },
    { field: 'keyFob', label: 'Key & Fob' },
    { field: 'laborCleaning', label: 'Labor - Detailing' },
    { field: 'licenseRegistration', label: 'License & Registration' },
    { field: 'mechanic', label: 'Mechanic' },
    { field: 'oilLube', label: 'Oil/Lube' },
    { field: 'parts', label: 'Parts' },
    { field: 'skiRacks', label: 'Ski Racks' },
    { field: 'tickets', label: 'Tickets & Tolls' },
    { field: 'tiredAirStation', label: 'Tired Air Station' },
    { field: 'tires', label: 'Tires' },
    { field: 'towingImpoundFees', label: 'Towing / Impound Fees' },
    { field: 'uberLyftLime', label: 'Uber/Lyft/Lime' },
    { field: 'windshield', label: 'Windshield' },
    { field: 'wipers', label: 'Wipers' },
  ];
  
  cogsFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.cogs[idx] as any)?.[field] || 0;
      csvContent += `$${Number(value).toFixed(2)},`;
      total += Number(value);
    });
    csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
  });
  
  // Export dynamic subcategories for COGS
  if (dynamicSubcategories?.cogs) {
    dynamicSubcategories.cogs.forEach((subcat) => {
      csvContent += `${subcat.name},`;
      let total = 0;
      MONTHS.forEach((_, idx) => {
        const monthValue = subcat.values.find((v: any) => v.month === idx + 1);
        const value = monthValue?.value || 0;
        csvContent += `$${Number(value).toFixed(2)},`;
        total += Number(value);
      });
      csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
    });
  }
  
  // Formula category - TOTAL OPERATING EXPENSE (COGS - Per Vehicle)
  csvContent += `TOTAL OPERATING EXPENSE (COGS - Per Vehicle),`;
  let totalCogsTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getTotalCogsForMonth(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    totalCogsTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalCogsTotal.toFixed(2)}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 5: Parking Fee & Labor Cleaning
  // ========================================
  csvContent += `SECTION,Parking Fee & Labor Cleaning\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  const parkingFields = [
    { field: 'glaParkingFee', label: 'GLA Parking Fee' },
    { field: 'laborCleaning', label: 'Labor - Detailing' },
  ];
  
  parkingFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.parkingFeeLabor[idx] as any)?.[field] || 0;
      csvContent += `$${Number(value).toFixed(2)},`;
      total += Number(value);
    });
    csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
  });
  
  // Export dynamic subcategories for Parking Fee & Labor Cleaning
  if (dynamicSubcategories?.parkingFeeLabor) {
    dynamicSubcategories.parkingFeeLabor.forEach((subcat) => {
      csvContent += `${subcat.name},`;
      let total = 0;
      MONTHS.forEach((_, idx) => {
        const monthValue = subcat.values.find((v: any) => v.month === idx + 1);
        const value = monthValue?.value || 0;
        csvContent += `$${Number(value).toFixed(2)},`;
        total += Number(value);
      });
      csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
    });
  }
  
  // Formula category - Total Parking Fee & Labor Cleaning
  csvContent += `Total Parking Fee & Labor Cleaning,`;
  let totalParkingTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const fixedTotal = (
      Number(getMonthValue(data.parkingFeeLabor, monthNum, "glaParkingFee")) || 0 +
      Number(getMonthValue(data.parkingFeeLabor, monthNum, "laborCleaning")) || 0
    );
    const dynamicTotal = (dynamicSubcategories?.parkingFeeLabor || []).reduce((sum: number, subcat: any) => {
      const monthValue = subcat.values?.find((v: any) => v.month === monthNum);
      return sum + (Number(monthValue?.value) || 0);
    }, 0);
    const value = Number(fixedTotal) + Number(dynamicTotal);
    csvContent += `$${value.toFixed(2)},`;
    totalParkingTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalParkingTotal.toFixed(2)}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 6: REIMBURSE AND NON-REIMBURSE BILLS
  // ========================================
  csvContent += `SECTION,REIMBURSE AND NON-REIMBURSE BILLS\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  const reimbursedFields = [
    { field: 'electricReimbursed', label: 'Electric - Reimbursed' },
    { field: 'electricNotReimbursed', label: 'Electric - Not Reimbursed' },
    { field: 'gasReimbursed', label: 'Gas - Reimbursed' },
    { field: 'gasNotReimbursed', label: 'Gas - Not Reimbursed' },
    { field: 'gasServiceRun', label: 'Gas - Service Run' },
    { field: 'parkingAirport', label: 'Parking Airport' },
    { field: 'uberLyftLimeNotReimbursed', label: 'Uber/Lyft/Lime - Not Reimbursed' },
    { field: 'uberLyftLimeReimbursed', label: 'Uber/Lyft/Lime - Reimbursed' },
  ];
  
  reimbursedFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.reimbursedBills[idx] as any)?.[field] || 0;
      csvContent += `$${Number(value).toFixed(2)},`;
      total += Number(value);
    });
    csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
  });
  
  // Export dynamic subcategories for Reimbursed Bills
  if (dynamicSubcategories?.reimbursedBills) {
    dynamicSubcategories.reimbursedBills.forEach((subcat) => {
      csvContent += `${subcat.name},`;
      let total = 0;
      MONTHS.forEach((_, idx) => {
        const monthValue = subcat.values.find((v: any) => v.month === idx + 1);
        const value = monthValue?.value || 0;
        csvContent += `$${Number(value).toFixed(2)},`;
        total += Number(value);
      });
      csvContent += `$0.00,$0.00,$${total.toFixed(2)}\n`;
    });
  }
  
  // Formula category - TOTAL REIMBURSE AND NON-REIMBURSE BILLS
  csvContent += `TOTAL REIMBURSE AND NON-REIMBURSE BILLS,`;
  let totalReimbursedTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getTotalReimbursedBillsForMonth(monthNum)) || 0;
    csvContent += `$${value.toFixed(2)},`;
    totalReimbursedTotal += value;
  });
  csvContent += `$0.00,$0.00,$${totalReimbursedTotal.toFixed(2)}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 7: HISTORY
  // ========================================
  csvContent += `SECTION,HISTORY\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  // Days Rented (manual entry)
  csvContent += `Days Rented,`;
  let daysRentedTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getMonthValue(data.history, monthNum, "daysRented")) || 0;
    csvContent += `${Number(value)},`;
    daysRentedTotal += Number(value);
  });
  csvContent += `0,0,${daysRentedTotal}\n`;
  
  // Cars Available For Rent (manual entry)
  csvContent += `Cars Available For Rent,`;
  let carsAvailableTotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getMonthValue(data.history, monthNum, "carsAvailableForRent")) || 0;
    csvContent += `${Number(value)},`;
    carsAvailableTotal += Number(value);
  });
  csvContent += `0,0,${carsAvailableTotal}\n`;
  
  // Trips Taken (still from history)
  csvContent += `Trips Taken,`;
  let tripsTakenTotal = 0;
  MONTHS.forEach((_, idx) => {
    const value = (data.history[idx] as any)?.tripsTaken || 0;
    csvContent += `${Number(value)},`;
    tripsTakenTotal += Number(value);
  });
  csvContent += `0,0,${tripsTakenTotal}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 8: CAR RENTAL VALUE PER MONTH (Formula categories)
  // ========================================
  csvContent += `SECTION,CAR RENTAL VALUE PER MONTH\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  // Total Car Rental Income
  csvContent += `Total Car Rental Income,`;
  let rentalIncomeTotal = 0;
  MONTHS.forEach((_, idx) => {
    const value = Number((data.incomeExpenses[idx] as any)?.rentalIncome) || 0;
    csvContent += `$${value.toFixed(2)},`;
    rentalIncomeTotal += value;
  });
  csvContent += `$0.00,$0.00,$${rentalIncomeTotal.toFixed(2)}\n`;
  
  // Trips Taken
  csvContent += `Trips Taken,`;
  let tripsTotalSection8 = 0;
  MONTHS.forEach((_, idx) => {
    const value = Number((data.history[idx] as any)?.tripsTaken) || 0;
    csvContent += `${value},`;
    tripsTotalSection8 += value;
  });
  csvContent += `0,0,${tripsTotalSection8}\n`;
  
  // Ave Per Rental Per Trips Taken
  csvContent += `Ave Per Rental Per Trips Taken,`;
  let aveRentalTotal = 0;
  MONTHS.forEach((_, idx) => {
    const rental = Number((data.incomeExpenses[idx] as any)?.rentalIncome) || 0;
    const trips = Number((data.history[idx] as any)?.tripsTaken) || 0;
    const value = trips > 0 ? rental / trips : 0;
    csvContent += `$${Number(value).toFixed(2)},`;
    aveRentalTotal += Number(value);
  });
  csvContent += `$0.00,$0.00,$${aveRentalTotal.toFixed(2)}\n`;
  
  csvContent += `\n`;
  
  // ========================================
  // SECTION 9: PARKING AIRPORT AVERAGE PER TRIP - GLA (Formula categories)
  // ========================================
  csvContent += `SECTION,PARKING AIRPORT AVERAGE PER TRIP - GLA\n`;
  csvContent += `Category,`;
  MONTHS.forEach((month) => {
    csvContent += `${month} ${year},`;
  });
  csvContent += `YER,YER SPLIT,TOTAL\n`;
  
  // Total Trips Taken
  csvContent += `Total Trips Taken,`;
  let tripsTotalGLA = 0;
  MONTHS.forEach((_, idx) => {
    const value = Number((data.history[idx] as any)?.tripsTaken) || 0;
    csvContent += `${value},`;
    tripsTotalGLA += value;
  });
  csvContent += `0,0,${tripsTotalGLA}\n`;
  
  // Total Parking Airport (from REIMBURSE AND NON-REIMBURSE BILLS)
  csvContent += `Total Parking Airport,`;
  let parkingAirportGLATotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const value = Number(getMonthValue(data.reimbursedBills, monthNum, "parkingAirport")) || 0;
    csvContent += `$${value.toFixed(2)},`;
    parkingAirportGLATotal += value;
  });
  csvContent += `$0.00,$0.00,$${parkingAirportGLATotal.toFixed(2)}\n`;
  
  // Average per trip
  csvContent += `Average per trip,`;
  let aveParkingGLATotal = 0;
  MONTHS.forEach((_, idx) => {
    const monthNum = idx + 1;
    const parking = Number(getMonthValue(data.reimbursedBills, monthNum, "parkingAirport")) || 0;
    const trips = Number((data.history[idx] as any)?.tripsTaken) || 0;
    const value = trips > 0 ? parking / trips : 0;
    csvContent += `$${Number(value).toFixed(2)},`;
    aveParkingGLATotal += Number(value);
  });
  csvContent += `$0.00,$0.00,$${aveParkingGLATotal.toFixed(2)}\n`;
  
  // ========================================
  // Download CSV File
  // ========================================
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `Income-Expense-${carInfo?.makeModel?.replace(/\s+/g, '-') || 'Car'}-${year}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper function to calculate total income for a month
 */
function calculateMonthTotalIncome(monthData: any): number {
  if (!monthData) return 0;
  
  return (
    Number(monthData.rentalIncome || 0) +
    Number(monthData.deliveryIncome || 0) +
    Number(monthData.electricPrepaidIncome || 0) +
    Number(monthData.smokingFines || 0) +
    Number(monthData.gasPrepaidIncome || 0) +
    Number(monthData.skiRacksIncome || 0) +
    Number(monthData.milesIncome || 0) +
    Number(monthData.childSeatIncome || 0) +
    Number(monthData.coolersIncome || 0) +
    Number(monthData.insuranceWreckIncome || 0) +
    Number(monthData.otherIncome || 0)
  );
}

/**
 * Parse imported CSV file and validate structure
 */
export function parseImportedCSV(
  fileContent: string
): {
  success: boolean;
  data?: any;
  error?: string;
  sections?: {
    managementSplit?: any;
    incomeExpenses?: any[];
    directDelivery?: any[];
    cogs?: any[];
    parkingFeeLabor?: any[];
    reimbursedBills?: any[];
    history?: any[];
    monthModes?: { [month: number]: 50 | 70 };
  };
} {
  try {
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 10) {
      return { success: false, error: 'File appears to be empty or invalid' };
    }
    
    const sections: any = {
      incomeExpenses: [],
      directDelivery: [],
      cogs: [],
      parkingFeeLabor: [],
      reimbursedBills: [],
      history: [],
      monthModes: {},
    };
    
    let currentSection = '';
    let headerLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split(',').map(cell => cell.trim());
      
      // Detect section headers
      if (cells[0] === 'SECTION') {
        currentSection = cells[1];
        i++; // Skip to next line (column headers or mode settings)
        
        // Check for mode settings line
        if (i < lines.length && lines[i].startsWith('Mode Settings')) {
          const modeLine = lines[i];
          const modeCells = modeLine.split(',');
          for (let j = 1; j < modeCells.length && j <= 12; j++) {
            const modeText = modeCells[j];
            const modeMatch = modeText.match(/:\s*(\d+)/);
            if (modeMatch) {
              const mode = parseInt(modeMatch[1]);
              sections.monthModes[j] = mode === 70 ? 70 : 50;
            }
          }
          i++; // Skip mode settings line
        }
        
        headerLine = lines[i]; // Store header for this section
        continue;
      }
      
      // Parse data rows based on current section
      if (currentSection && cells.length > 1) {
        const rowData: any = { category: cells[0] };
        
        // Parse 12 month values (columns 1-12)
        for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
          const cellValue = cells[monthIdx + 1] || '$0.00';
          const numValue = parseFloat(cellValue.replace(/[$,()]/g, '')) || 0;
          rowData[`month${monthIdx + 1}`] = numValue;
        }
        
        // Add to appropriate section
        if (currentSection.includes('INCOME & EXPENSES') || currentSection.includes('INCOME AND EXPENSES')) {
          sections.incomeExpenses.push(rowData);
        } else if (currentSection.includes('Direct Delivery')) {
          sections.directDelivery.push(rowData);
        } else if (currentSection.includes('COGS')) {
          sections.cogs.push(rowData);
        } else if (currentSection.includes('Parking Fee')) {
          sections.parkingFeeLabor.push(rowData);
        } else if (currentSection.includes('REIMBURSE')) {
          sections.reimbursedBills.push(rowData);
        } else if (currentSection.includes('HISTORY')) {
          sections.history.push(rowData);
        }
      }
    }
    
    return { success: true, sections };
    
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to parse CSV file' };
  }
}

/**
 * Export all data to JSON format (for backup/advanced users)
 */
export function exportToJSON(
  data: IncomeExpenseData,
  carInfo: any,
  year: string,
  monthModes: { [month: number]: 50 | 70 }
): void {
  const exportData = {
    carInfo: {
      name: carInfo?.makeModel || carInfo?.make + ' ' + carInfo?.model,
      vin: carInfo?.vin,
      license: carInfo?.licensePlate,
      owner: {
        name: `${carInfo?.owner?.firstName || ''} ${carInfo?.owner?.lastName || ''}`.trim(),
        email: carInfo?.owner?.email,
      },
    },
    year,
    monthModes,
    data: {
      incomeExpenses: data.incomeExpenses,
      directDelivery: data.directDelivery,
      cogs: data.cogs,
      parkingFeeLabor: data.parkingFeeLabor,
      reimbursedBills: data.reimbursedBills,
      history: data.history,
    },
    exportedAt: new Date().toISOString(),
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `Income-Expense-${carInfo?.makeModel?.replace(/\s+/g, '-') || 'Car'}-${year}.json`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
