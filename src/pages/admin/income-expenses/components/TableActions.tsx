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
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

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
  const { data, monthModes, year } = useIncomeExpense();
  const queryClient = useQueryClient();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportCSV = () => {
    exportAllIncomeExpenseData(data, car, selectedYear, monthModes);
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

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Year Selector */}
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
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
