// Modal for CAR MANAGEMENT OWNER SPLIT category
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

export default function ModalEditManagementSplit() {
  const { editingCell, setEditingCell, updateCell, saveChanges, isSaving, monthModes, year, carId } = useIncomeExpense();

  const monthName = editingCell ? MONTHS[editingCell.month - 1] : "";
  const isOpen = !!editingCell && editingCell.category === "managementSplit";

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

  if (!editingCell || editingCell.category !== "managementSplit") return null;

  const fieldNames: { [key: string]: string } = {
    carManagementSplit: "Car Management Split",
    carOwnerSplit: "Car Owner Split",
  };

  const fieldName = fieldNames[editingCell.field] || editingCell.field;
  
  // Get current mode for this month
  const currentMode = monthModes[editingCell.month];
  const modeDisplay = currentMode === 50 ? "50:50" : "30:70";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Update Car Management/Owner Split
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter management and owner split data for {monthName} {year}
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
            <Label className="text-gray-400 text-xs">Current Mode:</Label>
            <div className="text-white text-sm font-medium mt-1">
              {modeDisplay} Split
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Split Percentage:</Label>
            <div className="text-white text-sm font-medium mt-1">
              {editingCell.field === "carManagementSplit" 
                ? `${currentMode === 50 ? "50" : "30"}%`
                : `${currentMode === 50 ? "50" : "70"}%`
              }
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

          <div>
            <Label className="text-gray-400 text-xs">Calculated Amount:</Label>
            <Input
              value={`$${editingCell.value.toFixed(2)}`}
              disabled
              className="bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 text-sm mt-1"
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
