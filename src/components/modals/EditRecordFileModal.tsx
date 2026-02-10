import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildApiUrl } from "@/lib/queryClient";

interface EditRecordFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId: number;
  clientId?: number;
  itemEdit: {
    recordFilesAid: number;
    recordFilesDocName: string;
    recordFilesDate: string;
    recordFilesRemarks?: string;
    recordFilesGdrive?: string;
    recordFilesIsActive?: boolean; 
  };
}

// Helper function to format date for date input
// Avoids timezone conversion by using local date components
function formatDateForInput(dateString: string): string {
  if (!dateString) return "";
  
  try {
    // First, try to extract YYYY-MM-DD directly from string (most reliable)
    const dateMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    // If no YYYY-MM-DD format found, try parsing as Date but use local components
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Use local date components to avoid timezone shift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    
    // If still no match, try other common formats
    // Handle MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, month, day, year] = slashMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    return dateString;
  } catch (e) {
    return dateString;
  }
}

export function EditRecordFileModal({
  isOpen,
  onClose,
  carId,
  clientId,
  itemEdit,
}: EditRecordFileModalProps) {
  const queryClient = useQueryClient();

  // Initialize form data based on itemEdit
  const initializeFormData = () => {
    if (itemEdit && itemEdit.recordFilesAid) {
      return {
        record_files_doc_name: itemEdit.recordFilesDocName || "",
        record_files_date: formatDateForInput(itemEdit.recordFilesDate || ""),
        record_files_remarks: itemEdit.recordFilesRemarks || "",
      };
    }
    return {
      record_files_doc_name: "",
      record_files_date: "",
      record_files_remarks: "",
    };
  };

  const [formData, setFormData] = useState(initializeFormData);

  // Update form data when itemEdit changes
  useEffect(() => {
    if (isOpen && itemEdit && itemEdit.recordFilesAid) {
      const newFormData = {
        record_files_doc_name: itemEdit.recordFilesDocName || "",
        record_files_date: formatDateForInput(itemEdit.recordFilesDate || ""),
        record_files_remarks: itemEdit.recordFilesRemarks || "",
      };
      setFormData(newFormData);
    }
  }, [isOpen, itemEdit]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Validate itemEdit and recordFilesAid
      if (!itemEdit || !itemEdit.recordFilesAid || itemEdit.recordFilesAid <= 0) {
        console.error("EditRecordFileModal: Invalid itemEdit or recordFilesAid", itemEdit);
        throw new Error("Invalid record ID for update. Please refresh the page and try again.");
      }

      const recordId = itemEdit.recordFilesAid;
      const url = buildApiUrl(`/api/record-files/${recordId}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          record_files_doc_name: values.record_files_doc_name,
          record_files_date: values.record_files_date,
          record_files_remarks: values.record_files_remarks || "",
          record_files_doc_name_old: itemEdit.recordFilesDocName || "",
          record_files_date_old: itemEdit.recordFilesDate || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update" }));
        throw new Error(error.error || error.message || "Failed to update");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate all record-files queries to ensure UI updates
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/record-files"],
        exact: false 
      });
      // Refetch to ensure immediate UI update
      await queryClient.refetchQueries({ 
        queryKey: ["/api/record-files"],
        exact: false 
      });
      onClose();
    },
  });

  // Don't render if modal is closed or itemEdit is invalid
  if (!isOpen || !itemEdit || !itemEdit.recordFilesAid) {
    return null;
  }

  // Don't render form until data is loaded
  const isDataLoaded = formData.record_files_doc_name || formData.record_files_date;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have a valid record ID
    if (!itemEdit.recordFilesAid || itemEdit.recordFilesAid <= 0) {
      console.error("EditRecordFileModal: Cannot submit - invalid record ID", itemEdit);
      return;
    }
    
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={mutation.isPending}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-foreground mb-6">
          Edit Record File
        </h3>

        {!isDataLoaded && (
          <div className="text-muted-foreground text-sm mb-4">Loading record data...</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="doc_name" className="text-muted-foreground">
              Document Name *
            </Label>
            <Input
              id="doc_name"
              type="text"
              value={formData.record_files_doc_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  record_files_doc_name: e.target.value,
                }))
              }
              disabled={mutation.isPending}
              className="bg-card border-border text-foreground mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-muted-foreground">
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.record_files_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  record_files_date: e.target.value,
                }))
              }
              disabled={mutation.isPending}
              className="bg-card border-border text-foreground mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
              required
            />
          </div>

          <div>
            <Label htmlFor="remarks" className="text-muted-foreground">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={formData.record_files_remarks}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  record_files_remarks: e.target.value,
                }))
              }
              disabled={mutation.isPending}
              className="bg-card border-border text-foreground mt-1"
              rows={3}
              placeholder="Enter any additional notes or remarks about this record..."
            />
          </div>

          {mutation.isError && (
            <div className="text-red-700 text-sm">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "An error occurred"}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !formData.record_files_doc_name || !formData.record_files_date}
              className="bg-primary text-black hover:bg-primary/80"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

