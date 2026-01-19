import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIncomeExpense } from "../context/IncomeExpenseContext";
import { exportAllIncomeExpenseData, parseImportedCSV } from "../utils/exportImportUtils";
import { buildApiUrl } from "@/lib/queryClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { IncomeExpenseData } from "../types";

interface TableActionsProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  carId: number;
  car: any;
}

export default function TableActions({
  selectedYear,
  setSelectedYear,
  carId,
  car,
}: TableActionsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data, monthModes, year, dynamicSubcategories } = useIncomeExpense();
  const queryClient = useQueryClient();
  
  // Get current year and generate year options (past 5 years + current + future 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch previous year data for January's Negative Balance Carry Over calculation
  const previousYear = String(parseInt(selectedYear) - 1);
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
        return { success: true, data: null as any };
      }
      return response.json();
    },
    retry: false,
    enabled: !!carId && !!selectedYear,
  });

  const handleExportCSV = () => {
    exportAllIncomeExpenseData(data, car, selectedYear, monthModes, dynamicSubcategories, previousYearData?.data || null);
    toast({
      title: "Export Successful",
      description: `CSV file downloaded for ${car?.makeModel || 'car'} (${selectedYear})`,
    });
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const fileContent = await importFile.text();
      const parsed = parseImportedCSV(fileContent);

      if (!parsed.success) {
        throw new Error(parsed.error || "Failed to parse CSV");
      }

      // Send parsed data to backend
      const response = await fetch(buildApiUrl("/api/income-expense/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          carId,
          year: parseInt(selectedYear),
          sections: parsed.sections,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/income-expense", carId, selectedYear] });

      toast({
        title: "Import Successful",
        description: "All data has been imported successfully",
      });

      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleViewLog = () => {
    setLocation(`/admin/cars/${carId}/income-expense/log`);
  };

  const handleDownloadTemplate = () => {
    // Read the template file content
    const templateContent = `INCOME & EXPENSES,Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
Rental Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Delivery Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Electric Prepaid Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Smoking Fines,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Gas Prepaid Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Ski Racks Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Miles Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Child Seat Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Coolers Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Income insurance and Client Wrecks,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Other Income,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
,,,,,,,,,,,,
OPERATING EXPENSE (Direct Delivery),,,,,,,,,,,,
Category,Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
Labor - Detailing,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Labor - Delivery,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Parking - Airport,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Parking - Lot,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Uber/Lyft/Lime,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
,,,,,,,,,,,,
OPERATING EXPENSE (COGS - Per Vehicle),Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
Auto Body Shop / Wreck,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Alignment,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Battery,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Brakes,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Car Payment,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Car Insurance,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Car Seats,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Cleaning Supplies / Tools,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Emissions,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
GPS System,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Key & Fob,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Labor - Detailing,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
License & Registration,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Mechanic,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Oil/Lube,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Parts,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Ski Racks,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Tickets & Tolls,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Tired Air Station,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Tires,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Towing / Impound Fees,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Uber/Lyft/Lime,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Windshield,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Wipers,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
,,,,,,,,,,,,
PARKING FEE & LABOR CLEANING,Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
GLA Parking Fee,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Labor - Detailing,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
,,,,,,,,,,,,
REIMBURSE AND NON-REIMBURSE BILLS,Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
Electric - Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Electric - Not Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Gas - Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Gas - Not Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Gas - Service Run,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Parking Airport,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Uber/Lyft/Lime - Not Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
Uber/Lyft/Lime - Reimbursed,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00,$0.00
,,,,,,,,,,,,
HISTORY,Jan-${selectedYear.slice(-2)},Feb-${selectedYear.slice(-2)},Mar-${selectedYear.slice(-2)},Apr-${selectedYear.slice(-2)},May-${selectedYear.slice(-2)},Jun-${selectedYear.slice(-2)},Jul-${selectedYear.slice(-2)},Aug-${selectedYear.slice(-2)},Sep-${selectedYear.slice(-2)},Oct-${selectedYear.slice(-2)},Nov-${selectedYear.slice(-2)},Dec-${selectedYear.slice(-2)}
Days Rented,0,0,0,0,0,0,0,0,0,0,0,0
Cars Available For Rent,10,1,1,1,1,1,1,1,1,1,1,1
Trips Taken,0,0,0,0,0,0,0,0,0,0,0,0`;

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Income and Expenses Import Template ${selectedYear}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: `Template file downloaded for ${selectedYear}`,
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Year Selector */}
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm">
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

        {/* Import Button */}
        <Button
          onClick={() => setIsImportModalOpen(true)}
          variant="outline"
          size="sm"
          className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        {/* Download Template Button */}
        <Button
          onClick={handleDownloadTemplate}
          variant="outline"
          size="sm"
          className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
        >
          <FileText className="w-4 h-4 mr-2" />
          Download Template
        </Button>

        {/* Export Button */}
        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="sm"
          className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>

        {/* View Log Button */}
        <Button
          onClick={handleViewLog}
          variant="outline"
          size="sm"
          className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
        >
          <History className="w-4 h-4 mr-2" />
          Log
        </Button>
      </div>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Import Income and Expense Data
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload a CSV file to import all income and expense data for {car?.makeModel || 'this car'} ({selectedYear})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-6">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#EAEB80] file:text-black
                  hover:file:bg-[#d4d570] file:cursor-pointer"
              />
              {importFile && (
                <p className="text-sm text-gray-400 mt-2">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">What will be imported:</h4>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                <li>Car Management Owner Split (with mode settings)</li>
                <li>Income & Expenses (all income categories)</li>
                <li>Operating Expense (Direct Delivery)</li>
                <li>Operating Expense (COGS – Per Vehicle)</li>
                <li>Parking Fee & Labor Cleaning</li>
                <li>Reimburse and Non-Reimburse Bills</li>
                <li>History (days rented, trips, etc.)</li>
              </ul>
              <p className="text-yellow-400 text-xs mt-3">
                ⚠️ This will update all data for the selected year. Existing data will be overwritten.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
              }}
              variant="outline"
              className="flex-1 border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFile}
              className="flex-1 bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              disabled={!importFile || isImporting}
            >
              {isImporting ? "Importing..." : "Import Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
