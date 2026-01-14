import React, { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { IncomeExpenseData, EditingCell } from "../types";


interface IncomeExpenseContextType {
  data: IncomeExpenseData;
  isLoading: boolean;
  editingCell: EditingCell | null;
  setEditingCell: (cell: EditingCell | null) => void;
  updateCell: (category: string, field: string, month: number, value: number) => void;
  saveChanges: (immediateChange?: { category: string; field: string; month: number; value: number }) => void;
  isSaving: boolean;
  monthModes: { [month: number]: 50 | 70 };
  toggleMonthMode: (month: number) => Promise<void>;
  isSavingMode: boolean;
  year: string;
  carId: number;
}

const IncomeExpenseContext = createContext<IncomeExpenseContextType | undefined>(undefined);

export function useIncomeExpense() {
  const context = useContext(IncomeExpenseContext);
  if (!context) {
    throw new Error("useIncomeExpense must be used within IncomeExpenseProvider");
  }
  return context;
}

function getEmptyData(): IncomeExpenseData {
  const emptyMonthData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }));
  return {
    formulaSetting: { carManagementSplitPercent: 50, carOwnerSplitPercent: 50 },
    incomeExpenses: emptyMonthData.map((m) => ({
      ...m,
      rentalIncome: 0,
      deliveryIncome: 0,
      electricPrepaidIncome: 0,
      smokingFines: 0,
      gasPrepaidIncome: 0,
      skiRacksIncome: 0,
      milesIncome: 0,
      childSeatIncome: 0,
      coolersIncome: 0,
      insuranceWreckIncome: 0,
      otherIncome: 0,
      negativeBalanceCarryOver: 0,
      carPayment: 0,
      carManagementTotalExpenses: 0,
      carOwnerTotalExpenses: 0,
    })),
    directDelivery: emptyMonthData.map((m) => ({
      ...m,
      laborCarCleaning: 0,
      laborDelivery: 0,
      parkingAirport: 0,
      parkingLot: 0,
      uberLyftLime: 0,
    })),
    cogs: emptyMonthData.map((m) => ({
      ...m,
      autoBodyShopWreck: 0,
      alignment: 0,
      battery: 0,
      brakes: 0,
      carPayment: 0,
      carInsurance: 0,
      carSeats: 0,
      cleaningSuppliesTools: 0,
      emissions: 0,
      gpsSystem: 0,
      keyFob: 0,
      laborCleaning: 0,
      licenseRegistration: 0,
      mechanic: 0,
      oilLube: 0,
      parts: 0,
      skiRacks: 0,
      tickets: 0,
      tiredAirStation: 0,
      tires: 0,
      towingImpoundFees: 0,
      uberLyftLime: 0,
      windshield: 0,
      wipers: 0,
    })),
    parkingFeeLabor: emptyMonthData.map((m) => ({
      ...m,
      glaParkingFee: 0,
      laborCleaning: 0,
    })),
    reimbursedBills: emptyMonthData.map((m) => ({
      ...m,
      electricReimbursed: 0,
      electricNotReimbursed: 0,
      gasReimbursed: 0,
      gasNotReimbursed: 0,
      gasServiceRun: 0,
      parkingAirport: 0,
      uberLyftLimeNotReimbursed: 0,
      uberLyftLimeReimbursed: 0,
    })),
    officeSupport: emptyMonthData.map((m) => ({
      ...m,
      accountingProfessionalFees: 0,
      advertizing: 0,
      bankCharges: 0,
      detailMobile: 0,
      charitableContributions: 0,
      computerInternet: 0,
      deliveryPostageFreight: 0,
      detailShopEquipment: 0,
      duesSubscription: 0,
      generalAdministrative: 0,
      healthWellness: 0,
      laborSales: 0,
      laborSoftware: 0,
      legalProfessional: 0,
      marketing: 0,
      mealsEntertainment: 0,
      officeExpense: 0,
      officeRent: 0,
      outsideStaffContractors: 0,
      parkNJetBooth: 0,
      printing: 0,
      referral: 0,
      repairsMaintenance: 0,
      salesTax: 0,
      securityCameras: 0,
      shippingFreightDelivery: 0,
      suppliesMaterials: 0,
      taxesLicense: 0,
      telephone: 0,
      travel: 0,
      depreciationExpense: 0,
      vehicleDepreciationExpense: 0,
      vehicleLoanInterestExpense: 0,
    })),
    history: emptyMonthData.map((m) => ({
      ...m,
      daysRented: 0,
      carsAvailableForRent: 1,
      tripsTaken: 0,
    })),
  };
}

export function IncomeExpenseProvider({
  children,
  carId,
  year,
}: {
  children: ReactNode;
  carId: number;
  year: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  
  // Initialize monthModes with defaults
  const getDefaultMonthModes = (): { [month: number]: 50 | 70 } => {
    const modes: { [month: number]: 50 | 70 } = {};
    for (let i = 1; i <= 12; i++) {
      modes[i] = 50; // Default to 50:50 mode
    }
    return modes;
  };
  
  const [monthModes, setMonthModes] = useState<{ [month: number]: 50 | 70 }>(getDefaultMonthModes);
  const [isSavingMode, setIsSavingMode] = useState(false);

  // Fetch income/expense data
  const { data: incomeExpenseData, isLoading } = useQuery<{
    success: boolean;
    data: IncomeExpenseData;
  }>({
    queryKey: ["/api/income-expense", carId, year],
    queryFn: async () => {
      const response = await fetch(
        buildApiUrl(`/api/income-expense/${carId}/${year}`),
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch income/expense data");
      return response.json();
    },
    retry: false,
  });

  const data = incomeExpenseData?.data || getEmptyData();

  // Load monthModes from API response when data is fetched
  // Use a ref to track if we've loaded modes for this carId/year combo to prevent infinite loops
  const loadedKey = React.useRef<string>('');
  
  React.useEffect(() => {
    const currentKey = `${carId}-${year}`;
    
    // Only load if this is a new carId/year combination
    if (loadedKey.current !== currentKey && incomeExpenseData?.data) {
      loadedKey.current = currentKey;
      
      if (incomeExpenseData.data.formulaSetting?.monthModes) {
        // Merge with defaults to ensure all 12 months are present
        const defaults = getDefaultMonthModes();
        const loadedModes = { ...defaults, ...incomeExpenseData.data.formulaSetting.monthModes };
        setMonthModes(loadedModes);
      } else {
        // If formulaSetting exists but no monthModes, use defaults
        setMonthModes(getDefaultMonthModes());
      }
    }
  }, [incomeExpenseData, carId, year]);

  // Toggle month mode and save to backend
  const toggleMonthMode = async (month: number) => {
    // Optimistically update UI
    const newModes: { [month: number]: 50 | 70 } = {
      ...monthModes,
      [month]: monthModes[month] === 50 ? 70 : 50,
    };
    setMonthModes(newModes);
    setIsSavingMode(true);

    try {
      const response = await fetch(buildApiUrl("/api/income-expense/formula"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          carId,
          year: parseInt(year),
          monthModes: newModes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save mode change");
      }

      const result = await response.json();
      
      // Update with server response to ensure consistency
      if (result.data?.monthModes) {
        setMonthModes({ ...getDefaultMonthModes(), ...result.data.monthModes });
      }

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/income-expense", carId, year] });
      
      toast({
        title: "Success",
        description: "Mode updated successfully",
      });
    } catch (error: any) {
      // Revert on error
      setMonthModes(monthModes);
      toast({
        title: "Error",
        description: error.message || "Failed to save mode change",
        variant: "destructive",
      });
    } finally {
      setIsSavingMode(false);
    }
  };

  const updateCell = (category: string, field: string, month: number, value: number) => {
    const key = `${category}-${field}-${month}`;
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, { category, field, month, value });
    setPendingChanges(newChanges);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changesByCategory = new Map<string, any>();

      // Group changes by category and month
      pendingChanges.forEach(({ category, field, month, value }) => {
        const key = `${category}-${month}`;
        if (!changesByCategory.has(key)) {
          changesByCategory.set(key, { category, month, fields: {} });
        }
        changesByCategory.get(key).fields[field] = value;
      });

      // Send updates to backend
      const promises: Promise<any>[] = [];

      changesByCategory.forEach(({ category, month, fields }) => {
        const endpoint = getCategoryEndpoint(category);
        if (endpoint) {
          promises.push(
            fetch(buildApiUrl(endpoint), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                carId,
                year: parseInt(year),
                month,
                ...fields,
              }),
            }).then((res) => {
              if (!res.ok) throw new Error(`Failed to update ${category}`);
              return res.json();
            })
          );
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-expense", carId, year] });
      setPendingChanges(new Map());
      setEditingCell(null); // Close modal after successful save
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const saveChanges = (immediateChange?: { category: string; field: string; month: number; value: number }) => {
    // If an immediate change is provided, add it to pendingChanges first
    if (immediateChange) {
      const key = `${immediateChange.category}-${immediateChange.field}-${immediateChange.month}`;
      const newChanges = new Map(pendingChanges);
      newChanges.set(key, immediateChange);
      setPendingChanges(newChanges);
      
      // Use the updated map for saving
      const changesByCategory = new Map<string, any>();
      newChanges.forEach(({ category, field, month, value }) => {
        const catKey = `${category}-${month}`;
        if (!changesByCategory.has(catKey)) {
          changesByCategory.set(catKey, { category, month, fields: {} });
        }
        changesByCategory.get(catKey).fields[field] = value;
      });

      // Send updates to backend
      const promises: Promise<any>[] = [];
      changesByCategory.forEach(({ category, month, fields }) => {
        const endpoint = getCategoryEndpoint(category);
        if (endpoint) {
          promises.push(
            fetch(buildApiUrl(endpoint), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                carId,
                year: parseInt(year),
                month,
                ...fields,
              }),
            }).then((res) => {
              if (!res.ok) throw new Error(`Failed to update ${category}`);
              return res.json();
            })
          );
        }
      });

      Promise.all(promises)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/income-expense", carId, year] });
          setPendingChanges(new Map());
          setEditingCell(null);
          toast({
            title: "Success",
            description: "Changes saved successfully",
          });
        })
        .catch((error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to save changes",
            variant: "destructive",
          });
        });
      
      return;
    }

    // Original behavior: save from pendingChanges
    if (pendingChanges.size === 0) {
      toast({
        title: "No changes",
        description: "No changes to save",
      });
      return;
    }
    saveMutation.mutate();
  };

  function getCategoryEndpoint(category: string): string | null {
    const endpoints: { [key: string]: string } = {
      income: "/api/income-expense/income",
      directDelivery: "/api/income-expense/direct-delivery",
      cogs: "/api/income-expense/cogs",
      parkingFeeLabor: "/api/income-expense/parking-fee-labor",
      reimbursedBills: "/api/income-expense/reimbursed-bills",
      officeSupport: "/api/income-expense/office-support",
      history: "/api/income-expense/history",
    };
    return endpoints[category] || null;
  }

  return (
    <IncomeExpenseContext.Provider
      value={{
        data,
        isLoading,
        editingCell,
        setEditingCell,
        updateCell,
        saveChanges,
        isSaving: saveMutation.isPending,
        monthModes,
        toggleMonthMode,
        isSavingMode,
        year,
        carId,
      }}
    >
      {children}
    </IncomeExpenseContext.Provider>
  );
}
