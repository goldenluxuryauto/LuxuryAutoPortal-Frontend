// Modal for PARKING AIRPORT QB category
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIncomeExpense } from "../context/IncomeExpenseContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ModalEditParkingAirportQB() {
  const { editingCell, setEditingCell, updateCell, saveChanges, isSaving, year } = useIncomeExpense();

  const monthName = editingCell ? MONTHS[editingCell.month - 1] : "";
  const isOpen = !!editingCell && editingCell.category === "parkingAirportQB";

  const handleClose = () => {
    setEditingCell(null);
  };

  const handleSave = () => {
    if (!editingCell) return;
    
    // Save the change immediately, passing it directly to saveChanges
    saveChanges({
      category: editingCell.category,
      field: editingCell.field,
      month: editingCell.month,
      value: editingCell.value,
    });
  };

  if (!editingCell || editingCell.category !== "parkingAirportQB") return null;

  const fieldNames: { [key: string]: string } = {
    totalParkingAirport: "Total Parking Airport",
  };

  const fieldName = fieldNames[editingCell.field] || editingCell.field;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Update Parking Airport QB
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter parking airport data for {monthName} {year}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-400 text-xs">Type:</Label>
            <div className="text-white text-sm font-medium mt-1">{fieldName}</div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Date:</Label>
            <div className="text-white text-sm font-medium mt-1">
              {monthName} {year}
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Amount</Label>
            <Input
              type="number"
              value={editingCell.value}
              onChange={(e) =>
                setEditingCell({
                  ...editingCell,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm mt-1"
              step="0.01"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1 border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
