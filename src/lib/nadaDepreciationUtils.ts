// NADA Depreciation Schedule Utility Functions
// Based on functions-nada.jsx from gla-v1-nov11-2025

export interface NadaDepreciation {
  nadaDepreciationAid: number;
  nadaDepreciationIsActive: boolean;
  nadaDepreciationCarId: number;
  nadaDepreciationId: number;
  nadaDepreciationDate: string; // Format: YYYY-MM
  nadaDepreciationAmount: number;
  nadaDepreciationCreated: string;
  nadaDepreciationDatetime: string;
}

export interface NadaDepreciationWithAdd {
  nadaDepreciationWithAddAid: number;
  nadaDepreciationWithAddIsActive: boolean;
  nadaDepreciationWithAddCarId: number;
  nadaDepreciationWithAddId: number;
  nadaDepreciationWithAddDate: string; // Format: YYYY-MM
  nadaDepreciationWithAddAmount: number;
  nadaDepreciationWithAddCreated: string;
  nadaDepreciationWithAddDatetime: string;
}

export interface CurrentCost {
  currentCostAid: number;
  currentCostIsActive: boolean;
  currentCostName: string;
  currentCostCompute: string;
  currentCostCreated: string;
  currentCostDatetime: string;
}

export interface CurrentCostWithAdd {
  currentCostWithAddAid: number;
  currentCostWithAddIsActive: boolean;
  currentCostWithAddName: string;
  currentCostWithAddCreated: string;
  currentCostWithAddDatetime: string;
}

const getAllMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Get current cost with add for a specific month/category
 * @param monthKey Month number (1-12) or null for current (latest month)
 * @param costItemId Category ID
 * @param nadaDepreciationWithAdd Previous year data
 * @param year Year to filter
 */
export function getCurrentCostWithAdd(
  monthKey: number | null,
  costItemId: number,
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  year: string
): { amount: number; dataItem: NadaDepreciationWithAdd | null; currentAmount: number } {
  let currentAmount = 0;
  let amount = 0;
  let dataItem: NadaDepreciationWithAdd | null = null;
  const highestDateVal: number[] = [];
  let maxDate = new Date(0);

  // Get all months for the year
  nadaDepreciationWithAdd.forEach((e) => {
    const dateYear = e.nadaDepreciationWithAddDate.split("-")[0];
    if (dateYear === year) {
      const month = parseInt(e.nadaDepreciationWithAddDate.split("-")[1]);
      highestDateVal.push(month);
    }
  });

  const maxValue = highestDateVal.length > 0 ? Math.max(...highestDateVal) : 0;

  nadaDepreciationWithAdd.forEach((item) => {
    // Match original: new Date(item.nada_depreciation_with_add_date)
    // For "YYYY-MM" format, we need to append "-01" for valid date parsing
    // However, we must match the original's exact logic which uses string comparison for year
    const itemDate = new Date(item.nadaDepreciationWithAddDate + "-01");
    const dateYear = item.nadaDepreciationWithAddDate.split("-")[0];
    const dateMonth = parseInt(item.nadaDepreciationWithAddDate.split("-")[1]);

    // Get amount for specific month (matching original logic exactly)
    if (
      monthKey !== null &&
      item.nadaDepreciationWithAddId === costItemId &&
      dateMonth === monthKey &&
      dateYear === year
    ) {
      amount = Number(item.nadaDepreciationWithAddAmount);
      dataItem = item;
    }

    // Get current amount (latest month) - matching original EXACTLY:
    // Original checks: Number(date.split("-")[0]) === Number(year) && itemDate > maxDate && month === maxValue
    // Note: Original uses string comparison for year, NOT getFullYear()
    if (
      item.nadaDepreciationWithAddId === costItemId &&
      Number(dateYear) === Number(year) &&
      itemDate > maxDate &&
      dateMonth === maxValue
    ) {
      maxDate = itemDate;
      currentAmount = Number(item.nadaDepreciationWithAddAmount);
    }
  });

  return { amount, dataItem, currentAmount };
}

/**
 * Get current cost for a specific month/category
 * @param monthKey Month number (1-12) or null for current (latest month)
 * @param costItemId Category ID
 * @param nadaDepreciation Current year data
 * @param year Year to filter
 */
export function getCurrentCost(
  monthKey: number | null,
  costItemId: number,
  nadaDepreciation: NadaDepreciation[],
  year: string
): { amount: number; dataItem: NadaDepreciation | null; currentAmount: number } {
  let currentAmount = 0;
  let amount = 0;
  let dataItem: NadaDepreciation | null = null;
  const highestDateVal: number[] = [];
  let maxDate = new Date(0);

  // Get all months for the year
  nadaDepreciation.forEach((e) => {
    const dateYear = e.nadaDepreciationDate.split("-")[0];
    if (dateYear === year) {
      const month = parseInt(e.nadaDepreciationDate.split("-")[1]);
      highestDateVal.push(month);
    }
  });

  const maxValue = highestDateVal.length > 0 ? Math.max(...highestDateVal) : 0;

  nadaDepreciation.forEach((item) => {
    // Match original: new Date(item.nada_depreciation_date)
    // For "YYYY-MM" format, we need to append "-01" for valid date parsing
    const itemDate = new Date(item.nadaDepreciationDate + "-01");
    const dateYear = item.nadaDepreciationDate.split("-")[0];
    const dateMonth = parseInt(item.nadaDepreciationDate.split("-")[1]);

    // Get amount for specific month (matching original logic exactly)
    if (
      monthKey !== null &&
      item.nadaDepreciationId === costItemId &&
      dateMonth === monthKey &&
      dateYear === year
    ) {
      amount = Number(item.nadaDepreciationAmount);
      dataItem = item;
    }

    // Get current amount (latest month) - matching original: uses getFullYear() check
    // Original checks: itemDate.getFullYear() === Number(year) && itemDate > maxDate && month === maxValue
    if (
      item.nadaDepreciationId === costItemId &&
      itemDate.getFullYear() === Number(year) &&
      itemDate > maxDate &&
      dateMonth === maxValue
    ) {
      maxDate = itemDate;
      currentAmount = Number(item.nadaDepreciationAmount);
    }
  });

  return { amount, dataItem, currentAmount };
}

/**
 * Calculate NADA change percentage between previous and current year
 * Overload 1: Without code parameter - returns object with all change values
 */
export function getNadaChange(
  monthKey: number,
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[],
  year: string
): {
  changeRetail: number;
  changeClean: number;
  changeAverage: number;
  changeRough: number;
  currentChangeRetail: number;
  currentChangeClean: number;
  currentChangeAverage: number;
  currentChangeRough: number;
};

/**
 * Overload 2: With code parameter - returns single number value
 */
export function getNadaChange(
  monthKey: number,
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[],
  year: string,
  code: "changeRetail" | "changeClean" | "changeAverage" | "changeRough" | "currentChangeRetail" | "currentChangeClean" | "currentChangeAverage" | "currentChangeRough"
): number;

/**
 * Implementation
 */
export function getNadaChange(
  monthKey: number,
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[],
  year: string,
  code?: "changeRetail" | "changeClean" | "changeAverage" | "changeRough" | "currentChangeRetail" | "currentChangeClean" | "currentChangeAverage" | "currentChangeRough" | null
): {
  changeRetail: number;
  changeClean: number;
  changeAverage: number;
  changeRough: number;
  currentChangeRetail: number;
  currentChangeClean: number;
  currentChangeAverage: number;
  currentChangeRough: number;
} | number {
  let changeRetail = 0;
  let changeClean = 0;
  let changeAverage = 0;
  let changeRough = 0;

  let currentChangeRetail = 0;
  let currentChangeClean = 0;
  let currentChangeAverage = 0;
  let currentChangeRough = 0;

  if (nadaDepreciationWithAdd.length > 0 && nadaDepreciation.length > 0) {
    nadaDepreciationWithAdd.forEach((withItem) => {
      const withDateYear = withItem.nadaDepreciationWithAddDate.split("-")[0];
      const withDateMonth = parseInt(withItem.nadaDepreciationWithAddDate.split("-")[1]);

      if (withDateMonth === monthKey && withDateYear === year) {
        nadaDepreciation.forEach((nadaItem) => {
          const nadaDateYear = nadaItem.nadaDepreciationDate.split("-")[0];
          const nadaDateMonth = parseInt(nadaItem.nadaDepreciationDate.split("-")[1]);

          if (nadaDateMonth === monthKey && nadaDateYear === year) {
            // Retail (ID: 1)
            if (withItem.nadaDepreciationWithAddId === 1 && nadaItem.nadaDepreciationId === 1) {
              const prevAmount = Number(withItem.nadaDepreciationWithAddAmount);
              const currAmount = Number(nadaItem.nadaDepreciationAmount);
              if (prevAmount !== 0) {
                changeRetail = ((currAmount - prevAmount) / prevAmount) * 100;
              }
            }

            // Clean (ID: 2)
            if (withItem.nadaDepreciationWithAddId === 2 && nadaItem.nadaDepreciationId === 2) {
              const prevAmount = Number(withItem.nadaDepreciationWithAddAmount);
              const currAmount = Number(nadaItem.nadaDepreciationAmount);
              if (prevAmount !== 0) {
                changeClean = ((currAmount - prevAmount) / prevAmount) * 100;
              }
            }

            // Average (ID: 3)
            if (withItem.nadaDepreciationWithAddId === 3 && nadaItem.nadaDepreciationId === 3) {
              const prevAmount = Number(withItem.nadaDepreciationWithAddAmount);
              const currAmount = Number(nadaItem.nadaDepreciationAmount);
              if (prevAmount !== 0) {
                changeAverage = ((currAmount - prevAmount) / prevAmount) * 100;
              }
            }

            // Rough (ID: 4)
            if (withItem.nadaDepreciationWithAddId === 4 && nadaItem.nadaDepreciationId === 4) {
              const prevAmount = Number(withItem.nadaDepreciationWithAddAmount);
              const currAmount = Number(nadaItem.nadaDepreciationAmount);
              if (prevAmount !== 0) {
                changeRough = ((currAmount - prevAmount) / prevAmount) * 100;
              }
            }
          }
        });
      }
    });
  }

  // If code parameter is provided, return the specific value
  if (code !== null && code !== undefined) {
    if (code === "changeRetail") return changeRetail;
    if (code === "changeClean") return changeClean;
    if (code === "changeAverage") return changeAverage;
    if (code === "changeRough") return changeRough;
    if (code === "currentChangeRetail") return currentChangeRetail;
    if (code === "currentChangeClean") return currentChangeClean;
    if (code === "currentChangeAverage") return currentChangeAverage;
    if (code === "currentChangeRough") return currentChangeRough;
  }

  // Return object with all values (backward compatible)
  return {
    changeRetail,
    changeClean,
    changeAverage,
    changeRough,
    currentChangeRetail,
    currentChangeClean,
    currentChangeAverage,
    currentChangeRough,
  };
}

/**
 * Calculate current NADA change percentage (latest month)
 */
export function getNadaChangeCurrent(
  year: string,
  categoryId: number,
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[]
): number {
  let prevAmount = 0;
  let currentAmount = 0;

  const highestDateValWithAdd: number[] = [];
  const highestDateVal: number[] = [];

  nadaDepreciationWithAdd.forEach((e) => {
    const dateYear = e.nadaDepreciationWithAddDate.split("-")[0];
    if (dateYear === year) {
      const month = parseInt(e.nadaDepreciationWithAddDate.split("-")[1]);
      highestDateValWithAdd.push(month);
    }
  });

  nadaDepreciation.forEach((e) => {
    const dateYear = e.nadaDepreciationDate.split("-")[0];
    if (dateYear === year) {
      const month = parseInt(e.nadaDepreciationDate.split("-")[1]);
      highestDateVal.push(month);
    }
  });

  const maxValueWithAdd = highestDateValWithAdd.length > 0 ? Math.max(...highestDateValWithAdd) : 0;
  const maxValue = highestDateVal.length > 0 ? Math.max(...highestDateVal) : 0;

  let prevMaxDate = new Date(0);
  let currentMaxDate = new Date(0);

  nadaDepreciationWithAdd.forEach((item) => {
    // Match original: new Date(nadaItem.nada_depreciation_with_add_date)
    // Original uses getFullYear() check, not string comparison
    const itemDate = new Date(item.nadaDepreciationWithAddDate + "-01");
    const dateMonth = parseInt(item.nadaDepreciationWithAddDate.split("-")[1]);

    // Match original exactly: itemDate.getFullYear() === Number(year)
    if (
      item.nadaDepreciationWithAddId === categoryId &&
      itemDate.getFullYear() === Number(year) &&
      itemDate > prevMaxDate &&
      dateMonth === maxValueWithAdd
    ) {
      prevMaxDate = itemDate;
      prevAmount = Number(item.nadaDepreciationWithAddAmount);
    }
  });

  nadaDepreciation.forEach((item) => {
    // Match original: new Date(nadaItem.nada_depreciation_date)
    // Original uses getFullYear() check, not string comparison
    const itemDate = new Date(item.nadaDepreciationDate + "-01");
    const dateMonth = parseInt(item.nadaDepreciationDate.split("-")[1]);

    // Match original exactly: itemDate.getFullYear() === Number(year)
    if (
      item.nadaDepreciationId === categoryId &&
      itemDate.getFullYear() === Number(year) &&
      itemDate > currentMaxDate &&
      dateMonth === maxValue
    ) {
      currentMaxDate = itemDate;
      currentAmount = Number(item.nadaDepreciationAmount);
    }
  });

  if (prevAmount === 0) return 0;
  const finalAmount = ((currentAmount - prevAmount) / prevAmount) * 100;
  return isNaN(finalAmount) || !isFinite(finalAmount) ? 0 : finalAmount;
}

/**
 * Calculate total equity in car (Retail - Amount Owed)
 */
export function getTotalEquity(
  monthKey: number,
  nadaDepreciation: NadaDepreciation[],
  year: string,
  currentCost: CurrentCost[]
): number {
  let nadaRetail = 0;
  let amountOwed = 0;

  // Ensure currentCost is an array and has items
  if (!currentCost || currentCost.length === 0) {
    return 0;
  }

  nadaDepreciation.forEach((item) => {
    const dateYear = item.nadaDepreciationDate.split("-")[0];
    const dateMonth = parseInt(item.nadaDepreciationDate.split("-")[1]);

    if (dateMonth === monthKey && dateYear === year) {
      currentCost.forEach((costItem, costKey) => {
        // First category (Retail - ID: 1)
        if (item.nadaDepreciationId === costItem.currentCostAid && costKey === 0) {
          nadaRetail = Number(item.nadaDepreciationAmount);
        }
        // Last category (Amount Owed - ID: 6)
        // Use length - 1 to get the last index (matches original logic using count - 1)
        if (
          item.nadaDepreciationId === costItem.currentCostAid &&
          costKey === currentCost.length - 1
        ) {
          amountOwed = Number(item.nadaDepreciationAmount);
        }
      });
    }
  });

  return nadaRetail - amountOwed;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Generate months array for a given year
 */
export function generateMonths(year: string): string[] {
  const yearNum = parseInt(year, 10);
  return getAllMonths.map((month) => `${month} ${yearNum}`);
}

/**
 * Get all unique years from both depreciation datasets
 */
export function getAllUniqueYears(
  nadaDepreciation: { all_year: Array<{ date_year: string }> } | undefined,
  nadaDepreciationWithAdd: { all_year: Array<{ date_year: string }> } | undefined
): string[] {
  const years = new Set<string>();
  
  if (nadaDepreciation?.all_year) {
    nadaDepreciation.all_year.forEach((item) => {
      if (item.date_year) years.add(item.date_year);
    });
  }
  
  if (nadaDepreciationWithAdd?.all_year) {
    nadaDepreciationWithAdd.all_year.forEach((item) => {
      if (item.date_year) years.add(item.date_year);
    });
  }
  
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}

/**
 * Export NADA Depreciation Schedule to CSV (Template Format)
 */
export function handleExportNada(
  currentCostWithAdd: CurrentCostWithAdd[],
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[],
  currentCost: CurrentCost[],
  car: any,
  year: string
): void {
  const saveData = (data: string, fileName: string) => {
    const a = document.createElement("a");
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, data], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getAllMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Extract year suffix for month headers (e.g., "26" from "2026")
  const yearSuffix = year.length >= 2 ? year.slice(-2) : year;
  
  // Calculate previous year
  const previousYear = (parseInt(year) - 1).toString();
  const previousYearSuffix = previousYear.length >= 2 ? previousYear.slice(-2) : previousYear;

  let str = "";

  // Section 1: Previous Year NADA Depreciation Schedule
  str += `NADA Depreciation Schedule,${previousYear}\n`;
  str += "Current Cost of Vehicle,";
  getAllMonths.forEach((mItem) => {
    str += `${mItem}-${previousYearSuffix},`;
  });
  str += "\n";

  // Previous year data rows (sorted by ID: Retail, Clean, Average, Rough, MILES)
  const sortedCostWithAdd = [...currentCostWithAdd].sort((a, b) => a.currentCostWithAddAid - b.currentCostWithAddAid);
  sortedCostWithAdd.forEach((item) => {
    str += `${item.currentCostWithAddName},`;
    for (let i = 0; i < 12; i++) {
      if (item.currentCostWithAddName.includes("MILES")) {
        str += "0,";
      } else {
        str += "$ 0.00,";
      }
    }
    str += "\n";
  });

  str += "\n"; // Empty row

  // Section 2: Current Year NADA Depreciation Schedule
  str += `NADA Depreciation Schedule,${year}\n`;
  str += "Current Cost of Vehicle,";
  getAllMonths.forEach((mItem) => {
    str += `${mItem}-${yearSuffix},`;
  });
  str += "\n";

  // Current year data rows (sorted by ID: Retail, Clean, Average, Rough, MILES, Amount Owed)
  const sortedCost = [...currentCost].sort((a, b) => a.currentCostAid - b.currentCostAid);
  sortedCost.forEach((costItem) => {
    str += `${costItem.currentCostName},`;
    for (let i = 0; i < 12; i++) {
      if (costItem.currentCostName.includes("MILES")) {
        str += "0,";
      } else {
        str += "$ 0.00,";
      }
    }
    str += "\n";
  });

  const fileName = `NADA Depreciation Schedule Template.csv`;
  saveData(str, fileName);
}

/**
 * Export NADA Depreciation Schedule to Excel
 */
export function handleExportNadaExcel(
  currentCostWithAdd: CurrentCostWithAdd[],
  nadaDepreciationWithAdd: NadaDepreciationWithAdd[],
  nadaDepreciation: NadaDepreciation[],
  currentCost: CurrentCost[],
  car: any,
  year: string
): void {
  // Dynamic import of xlsx to avoid loading it if not needed
  import('xlsx').then((XLSX) => {
    const getAllMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Extract year suffix for month headers (e.g., "26" from "2026")
    const yearSuffix = year.length >= 2 ? year.slice(-2) : year;
    
    // Calculate previous year
    const previousYear = (parseInt(year) - 1).toString();
    const previousYearSuffix = previousYear.length >= 2 ? previousYear.slice(-2) : previousYear;

    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    // Section 1: Previous Year NADA Depreciation Schedule
    worksheetData.push(["NADA Depreciation Schedule", previousYear]);
    const previousHeader = ["Current Cost of Vehicle"];
    getAllMonths.forEach((mItem) => {
      previousHeader.push(`${mItem}-${previousYearSuffix}`);
    });
    worksheetData.push(previousHeader);

    // Previous year data rows (sorted by ID: Retail, Clean, Average, Rough, MILES)
    const sortedCostWithAdd = [...currentCostWithAdd].sort((a, b) => a.currentCostWithAddAid - b.currentCostWithAddAid);
    sortedCostWithAdd.forEach((item) => {
      const row: any[] = [item.currentCostWithAddName];
      for (let i = 0; i < 12; i++) {
        row.push(0); // Template format - all values are 0
      }
      worksheetData.push(row);
    });

    worksheetData.push([]); // Empty row

    // Section 2: Current Year NADA Depreciation Schedule
    worksheetData.push(["NADA Depreciation Schedule", year]);
    const currentHeader = ["Current Cost of Vehicle"];
    getAllMonths.forEach((mItem) => {
      currentHeader.push(`${mItem}-${yearSuffix}`);
    });
    worksheetData.push(currentHeader);

    // Current year data rows (sorted by ID: Retail, Clean, Average, Rough, MILES, Amount Owed)
    const sortedCost = [...currentCost].sort((a, b) => a.currentCostAid - b.currentCostAid);
    sortedCost.forEach((costItem) => {
      const row: any[] = [costItem.currentCostName];
      for (let i = 0; i < 12; i++) {
        row.push(0); // Template format - all values are 0
      }
      worksheetData.push(row);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = [{ wch: 25 }]; // First column
    for (let i = 0; i < 12; i++) {
      colWidths.push({ wch: 12 }); // Month columns
    }
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "NADA Depreciation");

    // Generate filename
    const fileName = `NADA Depreciation Schedule Template.xlsx`;

    // Write file
    XLSX.writeFile(workbook, fileName);
  }).catch((error) => {
    console.error("Failed to export Excel file:", error);
    alert("Failed to export Excel file. Please ensure xlsx library is installed.");
  });
}

