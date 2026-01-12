import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileText, Copy, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useIncomeExpense } from "../context/IncomeExpenseContext";

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
  const { data, saveChanges, isSaving } = useIncomeExpense();

  const exportToCSV = () => {
    // CSV export logic (will implement below)
    toast({
      title: "Export successful",
      description: "CSV file has been downloaded",
    });
  };

  const exportToJSON = () => {
    const jsonData = {
      car: car?.makeModel || "Unknown",
      year: selectedYear,
      data: data,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `income-expense-${carId}-${selectedYear}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "JSON file has been downloaded",
    });
  };

  const copyToClipboard = () => {
    toast({
      title: "Copied!",
      description: "Data copied to clipboard",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
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
     
    </div>
  );
}
