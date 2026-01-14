// Modal for INCOME & EXPENSES category
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
import { Textarea } from "@/components/ui/textarea";
import { useIncomeExpense } from "../context/IncomeExpenseContext";
import ImagePreview from "../components/ImagePreview";
import { Check } from "lucide-react";
import { useImageUpload } from "../utils/useImageUpload";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ModalEditIncomeExpense() {
  const { editingCell, setEditingCell, updateCell, saveChanges, isSaving, year, carId } = useIncomeExpense();
  const [remarks, setRemarks] = useState("");

  const monthName = editingCell ? MONTHS[editingCell.month - 1] : "";
  const isOpen = !!editingCell && editingCell.category === "income";

  const {
    imageFiles,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleRemoveImage,
    handleConfirmUploads,
    resetImages,
  } = useImageUpload(
    carId,
    year,
    editingCell?.category || "",
    editingCell?.field || "",
    editingCell?.month || 1
  );

  const handleClose = () => {
    setEditingCell(null);
    setRemarks("");
    resetImages();
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

  if (!editingCell || editingCell.category !== "income") return null;

  // Get friendly field name
  const fieldNames: { [key: string]: string } = {
    rentalIncome: "Rental Income",
    deliveryIncome: "Delivery Income",
    electricPrepaidIncome: "Electric Prepaid Income",
    smokingFines: "Smoking Fines",
    gasPrepaidIncome: "Gas Prepaid Income",
    skiRacksIncome: "Ski Racks Income",
    milesIncome: "Miles Income",
    childSeatIncome: "Child Seat Income",
    coolersIncome: "Coolers Income",
    insuranceWreckIncome: "Insurance Wreck Income",
    otherIncome: "Other Income",
    negativeBalanceCarryOver: "Negative Balance Carry Over",
    carPayment: "Car Payment",
    carManagementTotalExpenses: "Car Management Total Expenses",
    carOwnerTotalExpenses: "Car Owner Total Expenses",
  };

  const fieldName = fieldNames[editingCell.field] || editingCell.field;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            {`Update ${fieldName}`}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter the amount for {fieldName} for {monthName} {year}
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

          <div>
            <Label className="text-gray-400 text-xs">Inputted Amount:</Label>
            <Input
              value={`$${editingCell.value.toFixed(2)}`}
              disabled
              className="bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 text-sm mt-1"
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes..."
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm min-h-[100px] mt-1"
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Upload Receipt Images</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileChange}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only image files (JPEG, PNG, GIF, WebP) are allowed
            </p>
            
            {imageFiles.length > 0 && (
              <div className="mt-3">
                <ImagePreview images={imageFiles} onRemove={handleRemoveImage} />
                <Button
                  type="button"
                  onClick={handleConfirmUploads}
                  disabled={isUploading}
                  className="mt-3 w-full bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Uploads ({imageFiles.length})
                    </>
                  )}
                </Button>
              </div>
            )}
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
