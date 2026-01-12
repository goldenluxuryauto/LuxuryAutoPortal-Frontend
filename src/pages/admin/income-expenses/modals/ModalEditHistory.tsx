// Modal for HISTORY category
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIncomeExpense } from "../context/IncomeExpenseContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ModalEditHistory() {
  const { editingCell, setEditingCell, updateCell, saveChanges, isSaving } = useIncomeExpense();

  const monthName = editingCell ? MONTHS[editingCell.month - 1] : "";
  const isOpen = !!editingCell && editingCell.category === "history";

  const handleClose = () => {
    setEditingCell(null);
  };

  const handleSave = () => {
    if (!editingCell) return;
    
    updateCell(
      editingCell.category,
      editingCell.field,
      editingCell.month,
      editingCell.value
    );
    
    saveChanges();
  };

  if (!editingCell || editingCell.category !== "history") return null;

  const fieldNames: { [key: string]: string } = {
    daysRented: "Days Rented",
    carsAvailableForRent: "Cars Available For Rent",
    tripsTaken: "Trips Taken",
  };

  const fieldName = fieldNames[editingCell.field] || editingCell.field;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Update Car History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-400 text-xs">Type:</Label>
            <div className="text-white text-sm font-medium mt-1">{fieldName}</div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Date:</Label>
            <div className="text-white text-sm font-medium mt-1">
              {monthName} {new Date().getFullYear()}
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Quantity</Label>
            <Input
              type="number"
              value={Math.round(editingCell.value)}
              onChange={(e) =>
                setEditingCell({
                  ...editingCell,
                  value: parseInt(e.target.value) || 0,
                })
              }
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm mt-1"
              step="1"
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
