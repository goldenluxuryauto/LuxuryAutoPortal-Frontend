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
  monthModes: { [month: number]: 50 | 70 }
): void {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
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
  
  // Car Management Split row (calculated - not exported as raw data)
  csvContent += `Car Management Split,`;
  MONTHS.forEach((month, idx) => {
    const mode = monthModes[idx + 1] || 50;
    const totalIncome = calculateMonthTotalIncome(data.incomeExpenses[idx]);
    const splitAmount = mode === 50 ? totalIncome * 0.5 : totalIncome * 0.3;
    csvContent += `$${splitAmount.toFixed(2)} (${mode === 50 ? 50 : 30}%),`;
  });
  csvContent += `$0.00,$0.00,$0.00\n`; // YER, YER SPLIT, TOTAL (calculated fields)
  
  // Car Owner Split row (calculated - not exported as raw data)
  csvContent += `Car Owner Split,`;
  MONTHS.forEach((month, idx) => {
    const mode = monthModes[idx + 1] || 50;
    const totalIncome = calculateMonthTotalIncome(data.incomeExpenses[idx]);
    const splitAmount = mode === 50 ? totalIncome * 0.5 : totalIncome * 0.7;
    csvContent += `$${splitAmount.toFixed(2)},`;
  });
  csvContent += `$0.00,$0.00,$0.00\n\n`; // YER, YER SPLIT, TOTAL
  
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
    { field: 'insuranceWreckIncome', label: 'Insurance Wreck Income' },
    { field: 'otherIncome', label: 'Other Income' },
    { field: 'negativeBalanceCarryOver', label: 'Negative Balance Carry Over' },
    { field: 'carPayment', label: 'Car Payment' },
    { field: 'carManagementTotalExpenses', label: 'Car Management Total Expenses' },
    { field: 'carOwnerTotalExpenses', label: 'Car Owner Total Expenses' },
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
    { field: 'laborCarCleaning', label: 'Labor - Car Cleaning' },
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
    { field: 'laborCleaning', label: 'Labor - Cleaning' },
    { field: 'licenseRegistration', label: 'License & Registration' },
    { field: 'mechanic', label: 'Mechanic' },
    { field: 'oilLube', label: 'Oil/Lube' },
    { field: 'parts', label: 'Parts' },
    { field: 'skiRacks', label: 'Ski Racks' },
    { field: 'tickets', label: 'Tickets' },
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
    { field: 'laborCleaning', label: 'Labor - Cleaning' },
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
  
  const historyFields = [
    { field: 'daysRented', label: 'Days Rented' },
    { field: 'carsAvailableForRent', label: 'Cars Available For Rent' },
    { field: 'tripsTaken', label: 'Trips Taken' },
  ];
  
  historyFields.forEach(({ field, label }) => {
    csvContent += `${label},`;
    let total = 0;
    MONTHS.forEach((_, idx) => {
      const value = (data.history[idx] as any)?.[field] || 0;
      csvContent += `${Number(value)},`;
      total += Number(value);
    });
    csvContent += `0,0,${total}\n`;
  });
  
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
