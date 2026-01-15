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
import { Upload, Image as ImageIcon } from "lucide-react";
import { useImageUpload } from "../utils/useImageUpload";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ModalEditIncomeExpense() {
  const { editingCell, setEditingCell, updateCell, saveChanges, isSaving, year, carId, monthModes } = useIncomeExpense();
  const [remarks, setRemarks] = useState("");

  const monthName = editingCell ? MONTHS[editingCell.month - 1] : "";
  const isOpen = !!editingCell && editingCell.category === "income";
  
  const {
    imageFiles,
    existingImages,
    isUploading,
    isLoadingImages,
    fileInputRef,
    handleFileChange,
    handleRemoveImage,
    handleRemoveExistingImage,
    uploadImages,
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

  const handleSave = async () => {
    if (!editingCell) return;
    
    try {
      // Upload images first if there are any new ones
      if (imageFiles.length > 0) {
        await uploadImages();
      }
      
      // Save the change immediately, passing it directly to saveChanges
      saveChanges({
        category: editingCell.category,
        field: editingCell.field,
        month: editingCell.month,
        value: editingCell.value,
      });
    } catch (error) {
      // Error already handled in uploadImages
      console.error("Error saving:", error);
    }
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
    insuranceWreckIncome: "Income insurance and Client Wrecks",
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
            <Label className="text-gray-400 text-xs">
              {editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit" 
                ? "Percentage" 
                : "Amount"}
            </Label>
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
              step={editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit" ? "1" : "0.01"}
              min={editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit" ? "0" : undefined}
              max={editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit" ? "100" : undefined}
              autoFocus
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">
              {editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit" 
                ? "Inputted Percentage:" 
                : "Inputted Amount:"}
            </Label>
            <Input
              value={
                editingCell.field === "carManagementSplit" || editingCell.field === "carOwnerSplit"
                  ? `${editingCell.value.toFixed(0)}%`
                  : editingCell.field === "carManagementSplit" && monthModes && monthModes[editingCell.month]
                  ? `$${editingCell.value.toFixed(2)}(${monthModes[editingCell.month] === 70 ? 30 : 50}%)`
                  : `$${editingCell.value.toFixed(2)}`
              }
              disabled
              className="bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 text-sm mt-1"
            />
          </div>

          {editingCell.field !== "carManagementSplit" && editingCell.field !== "carOwnerSplit" && (
            <div>
              <Label className="text-gray-400 text-xs">Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes..."
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm min-h-[100px] mt-1"
              />
            </div>
          )}
          <div>
            <Label className="text-gray-400 text-xs mb-2 block">Receipt Images</Label>
            
            {/* Beautiful Upload Button */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload-income"
              />
              <label
                htmlFor="receipt-upload-income"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-[#EAEB80]/50 rounded-lg bg-[#1a1a1a]/50 hover:border-[#EAEB80] hover:bg-[#1a1a1a] transition-all cursor-pointer group"
              >
                <Upload className="w-5 h-5 text-[#EAEB80] group-hover:scale-110 transition-transform" />
                <span className="text-[#EAEB80] font-medium text-sm">
                  {imageFiles.length > 0 
                    ? `Add More Images (${imageFiles.length} selected)`
                    : "Choose Images to Upload"
                  }
                </span>
                <ImageIcon className="w-5 h-5 text-[#EAEB80]/70" />
              </label>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: JPEG, PNG, GIF, WebP (Max 10MB per image)
            </p>
            
            {/* Image Preview Grid */}
            {(imageFiles.length > 0 || existingImages.length > 0 || isLoadingImages) && (
              <div className="mt-4">
                {isLoadingImages ? (
                  <div className="text-center py-4 text-gray-400 text-sm">Loading images...</div>
                ) : (
                  <ImagePreview
                    newImages={imageFiles}
                    existingImages={existingImages}
                    onRemoveNew={handleRemoveImage}
                    onRemoveExisting={handleRemoveExistingImage}
                  />
                )}
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
            disabled={isSaving || isUploading}
            className="flex-1 bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            {isSaving || isUploading ? "Saving..." : `Save${imageFiles.length > 0 ? ` & Upload ${imageFiles.length} Image${imageFiles.length > 1 ? 's' : ''}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
