import React, { useState } from "react";
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

export default function ModalEditDynamicSubcategory() {
  const {
    editingCell,
    setEditingCell,
    updateDynamicSubcategoryValue,
    dynamicSubcategories,
    year,
    carId,
  } = useIncomeExpense();
  const [value, setValue] = useState(0);

  React.useEffect(() => {
    if (editingCell) {
      setValue(editingCell.value);
    }
  }, [editingCell]);

  const isOpen = !!editingCell && editingCell.category?.startsWith("dynamic-");

  if (!isOpen || !editingCell) return null;

  const categoryType = editingCell.category.replace("dynamic-", "");
  const metadataIdMatch = editingCell.field.match(/subcategory-(\d+)/);
  const metadataId = metadataIdMatch ? parseInt(metadataIdMatch[1]) : 0;

  // Find the subcategory to get its name
  const subcategory = dynamicSubcategories[categoryType as keyof typeof dynamicSubcategories]?.find(
    (subcat: any) => subcat.id === metadataId
  );

  if (!subcategory) return null;

  const monthName = MONTHS[editingCell.month - 1];

  const handleClose = () => {
    setEditingCell(null);
    setValue(0);
  };

  const handleSave = async () => {
    if (!editingCell) return;

    await updateDynamicSubcategoryValue(
      categoryType,
      metadataId,
      editingCell.month,
      value,
      subcategory.name
    );

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Update {subcategory.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter the amount for {subcategory.name} for {monthName} {year}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-400 text-xs">Type:</Label>
            <div className="text-white text-sm font-medium mt-1">{subcategory.name}</div>
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
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm mt-1"
              step="0.01"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Inputted Amount:</Label>
            <Input
              value={`$${value.toFixed(2)}`}
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
            className="flex-1 bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
