import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface ExpenseRow {
  label: string;
  values: number[];
}

interface ExpenseCategory {
  label: string;
  isExpanded: boolean;
  rows: ExpenseRow[];
  total?: boolean;
}

const months = [
  "Jan 2025",
  "Feb 2025",
  "Mar 2025",
  "Apr 2025",
  "May 2025",
  "Jun 2025",
  "Jul 2025",
  "Aug 2025",
  "Sep 2025",
  "Oct 2025",
  "Nov 2025",
  "Dec 2025",
];

const additionalColumns = [
  "Yr End Recon",
  "Yr End Recon Split",
  "Total",
];

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function IncomeExpensesPage() {
  const [selectedCar, setSelectedCar] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Fetch cars for the dropdown
  const { data: carsData } = useQuery({
    queryKey: ["/api/cars"],
    queryFn: async () => {
      const response = await fetch("/api/cars");
      if (!response.ok) throw new Error("Failed to fetch cars");
      return response.json();
    },
  });

  const cars = carsData?.data || [];

  const [categories, setCategories] = useState<ExpenseCategory[]>([
    {
      label: "CAR MANAGEMENT AND OWNER SPLIT",
      isExpanded: false,
      rows: [
        { label: "Car Management Split", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Owner Split", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    },
    {
      label: "INCOME AND EXPENSES",
      isExpanded: false,
      rows: [
        { label: "Rental Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Delivery Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Electric Prepaid Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Smoking Fines", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas Prepaid Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Miles Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Ski Racks Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Child Seat Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Coolers Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Income Insurance and Client Wrecks", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Other Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Negative Balance Carry Over", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Payment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Management Total Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Owner Total Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Expense", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Profit", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    },
    {
      label: "OPERATING EXPENSES (DIRECT DELIVERY)",
      isExpanded: false,
      rows: [
        { label: "Labor - Car Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Driver", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parking - Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 1277, 45, 25, 0] },
        { label: "Taxi/Uber/Lyft/Lime", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39.96, 0] },
        { label: "OPERATING EXPENSE (Direct Delivery)", values: [0, 0, 0, 0, 0, 0, 0, 0, 1277, 45, 64.96, 0] },
      ],
      total: true,
    },
    {
      label: "OPERATING EXPENSES (COGS)",
      isExpanded: false,
      rows: [
        { label: "Auto Body Shop / Wreck", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Alignment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Battery", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Brakes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Payment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Insurance", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Car Seats", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Cleaning Supplies / Tools", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Emissions", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "GPS System", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Keys & Fob", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Detailing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Windshield", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Wipers", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Uber/Lyft/Lime", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Towing / Impound Fees", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tired Air Station", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tires", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Oil/Lube", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parts", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Ski Racks", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Tickets & Tolls", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Mechanic", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "License & Registration", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total's OPERATING EXPENSE (COGS - Per Vehicle)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "GLA PARKING FEE & LABOR CLEANING",
      isExpanded: false,
      rows: [
        { label: "GLA Labor - Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "GLA Parking Fee", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Parking Fee & Labor Cleaning", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "REIMBURSED AND NON-REIMBURSED BILLS",
      isExpanded: false,
      rows: [
        { label: "Electric - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Electric Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Gas - Service Run", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Parking Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Uber/Lyft/Lime - Not Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Uber/Lyft/Lime - Reimbursed", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Totals REIMBURSED AND NON-REIMBURSED BILLS", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "OPERATING EXPENSES (OFFICE SUPPORT)",
      isExpanded: false,
      rows: [
        { label: "Accounting & Professional Fees", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Advertizing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Bank Charges", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Detail Mobile", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Charitable Contributions", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Computer & Internet", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Delivery, Postage & Freight", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Detail Shop Equipment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Dues & Subscription", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "General and administrative (G&A)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Health & Wellness", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Human Resources", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor - Marketing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Office Rent", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Outside & Staff Contractors", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Park n Jet Booth", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Printing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Referral", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Repairs & Maintenance", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Sales Tax", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Security Cameras", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Supplies & Materials", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Taxes and License", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Telephone", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Travel", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor Software", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Legal & Professional", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Marketing", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Meals & Entertainment", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Office Expense", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Labor Sales", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Totals OPERATING EXPENSE (Office Support)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: true,
    },
    {
      label: "INCOME & EXPENSES SUMMARY",
      isExpanded: false,
      rows: [
        { label: "Total Rental Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Management Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Owner Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Management Car Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Owner Car Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Car Management Office Support Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "EBITDA",
      isExpanded: false,
      rows: [
        { label: "Total Rental Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Expenses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Interest", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Taxes", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Depreciation", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Amortization", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Net Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "EBITDA", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "EBITDA Margin", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "HISTORY",
      isExpanded: false,
      rows: [
        { label: "Days Rented", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Cars Available For Rent", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Trips Taken", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "CAR RENTAL VALUE PER MONTH",
      isExpanded: false,
      rows: [
        { label: "Total Car Rental Income", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Trips Taken", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Ave Per Rental Per Trips Taken", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "PARKING AIRPORT AVERAGE PER TRIP - GLA",
      isExpanded: false,
      rows: [
        { label: "Total Trips Taken", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Parking Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Average per trip", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
    {
      label: "PARKING AIRPORT AVERAGE PER TRIP - QB",
      isExpanded: false,
      rows: [
        { label: "Total Trips Taken", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Total Parking Airport", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { label: "Average per trip", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      total: false,
    },
  ]);

  const toggleCategory = (index: number) => {
    setCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, isExpanded: !cat.isExpanded } : cat))
    );
  };

  const calculateTotal = (rows: ExpenseRow[]): number[] => {
    return months.map((_, monthIndex) =>
      rows.reduce((sum, row) => sum + row.values[monthIndex], 0)
    );
  };

  const calculateYearEndRecon = (values: number[]): number => {
    return values.reduce((sum, val) => sum + val, 0);
  };

  const calculateYearEndReconSplit = (values: number[]): number => {
    // This would typically be a percentage or split calculation
    // For now, returning a placeholder calculation
    return calculateYearEndRecon(values) * 0.5;
  };

  const calculateGrandTotal = (values: number[]): number => {
    return calculateYearEndRecon(values);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 space-y-6 mb-6">
          <div>
            <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-2">Income and Expenses</h1>
            <p className="text-gray-400 text-sm">Financial tracking and expense management</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-[400px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">Select a car</label>
              <Select value={selectedCar} onValueChange={setSelectedCar}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                  <SelectValue placeholder="Select a car" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">All Cars</SelectItem>
                  {cars.map((car: any) => (
                    <SelectItem key={car.id} value={car.id.toString()}>
                      {car.make || ""} {car.model || ""} {car.year || ""} {car.vinNumber ? `(${car.vinNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]" style={{ float: 'right' }}>
              <label className="block text-sm font-medium text-gray-400 mb-2">Year</label>
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
        </div>

        <div className="flex-1 min-h-0 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="h-full overflow-y-auto w-full">
            <table className="border-collapse w-full table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                {months.map((_, idx) => <col key={idx} style={{ width: '5%' }} />)}
                {additionalColumns.map((_, idx) => <col key={idx} style={{ width: '6%' }} />)}
              </colgroup>
              <thead className="bg-[#1a1a1a]">
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 sticky top-0 left-0 bg-[#1a1a1a] z-[60] border-r border-[#2a2a2a]">
                    Category / Expense
                  </th>
                  {months.map((month) => (
                    <th
                      key={month}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1a1a1a] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  {additionalColumns.map((col) => (
                    <th
                      key={col}
                      className="text-right px-2 py-3 text-sm font-medium text-gray-300 sticky top-0 bg-[#1f1f1f] z-30 border-l border-[#2a2a2a] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((category, categoryIndex) => {
                  const categoryTotal = category.total ? calculateTotal(category.rows) : null;

                  return (
                    <React.Fragment key={categoryIndex}>
                      {/* Category Header */}
                      <tr
                        className="bg-[#151515] border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                        onClick={() => toggleCategory(categoryIndex)}
                      >
                        <td className="px-3 py-3 text-sm font-semibold text-[#EAEB80] sticky left-0 bg-[#151515] hover:bg-[#151515] z-[50] border-r border-[#2a2a2a]">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-center">{category.isExpanded ? "–" : "+"}</span>
                            <span>{category.label}</span>
                          </div>
                        </td>
                        {months.map((_, monthIndex) => (
                          <td
                            key={monthIndex}
                            className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a]"
                          >
                            {categoryTotal
                              ? formatCurrency(categoryTotal[monthIndex])
                              : formatCurrency(0)}
                          </td>
                        ))}
                        {categoryTotal && (
                          <>
                            <td className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateYearEndRecon(categoryTotal))}
                            </td>
                            <td className="text-right px-2 py-2 text-sm text-gray-400 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateYearEndReconSplit(categoryTotal))}
                            </td>
                            <td className="text-right px-2 py-2 text-sm font-semibold text-[#EAEB80] border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(calculateGrandTotal(categoryTotal))}
                            </td>
                          </>
                        )}
                        {!categoryTotal && (
                          <>
                            <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(0)}
                            </td>
                            <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(0)}
                            </td>
                            <td className="text-right px-2 py-2 text-sm text-gray-500 border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              {formatCurrency(0)}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Category Rows */}
                      {category.isExpanded &&
                        category.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-b border-[#2a2a2a] hover:bg-[#151515] transition-colors"
                          >
                            <td className="px-3 py-2 pl-12 text-sm text-gray-300 sticky left-0 bg-[#0f0f0f] z-[50] border-r border-[#2a2a2a]">
                              {row.label}
                            </td>
                            {row.values.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className={cn(
                                  "text-right px-2 py-2 text-sm border-l border-[#2a2a2a]",
                                  value !== 0
                                    ? "text-gray-300 font-medium"
                                    : "text-gray-500"
                                )}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateYearEndRecon(row.values) !== 0
                                  ? "text-gray-300 font-medium"
                                  : "text-gray-500"
                              )}>
                                {formatCurrency(calculateYearEndRecon(row.values))}
                              </span>
                            </td>
                            <td className="text-right px-2 py-2 text-sm border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateYearEndReconSplit(row.values) !== 0
                                  ? "text-gray-300 font-medium"
                                  : "text-gray-500"
                              )}>
                                {formatCurrency(calculateYearEndReconSplit(row.values))}
                              </span>
                            </td>
                            <td className="text-right px-2 py-2 text-sm font-semibold border-l border-[#2a2a2a] bg-[#1f1f1f]">
                              <span className={cn(
                                calculateGrandTotal(row.values) !== 0
                                  ? "text-gray-300"
                                  : "text-gray-400"
                              )}>
                                {formatCurrency(calculateGrandTotal(row.values))}
                              </span>
                            </td>
                          </tr>
                        ))}

                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

