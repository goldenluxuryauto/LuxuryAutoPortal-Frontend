import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

interface Payment {
  payments_aid: number;
  payments_client_id: number;
  payments_status_id: number;
  payments_car_id: number;
  payments_year_month: string;
  payments_amount: number;
  payments_amount_payout: number;
  payments_amount_balance: number;
  payments_reference_number: string;
  payments_invoice_id: string;
  payments_invoice_date: string | null;
  payments_attachment: string | null;
  payments_remarks: string | null;
  payment_status_name: string;
}

interface PaymentStatus {
  payment_status_aid: number;
  payment_status_name: string;
  payment_status_color: string;
  payment_status_is_active: number;
}

interface AddEditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  carId: number;
  clientId: number;
}

export function AddEditPaymentModal({
  isOpen,
  onClose,
  payment,
  carId,
  clientId,
}: AddEditPaymentModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = payment !== null;

  // Form state
  const [yearMonth, setYearMonth] = useState("");
  const [statusId, setStatusId] = useState("");
  const [payable, setPayable] = useState("");
  const [payout, setPayout] = useState("");
  const [balance, setBalance] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch payment statuses
  const { data: statusesData } = useQuery<{
    success: boolean;
    data: PaymentStatus[];
  }>({
    queryKey: ["/api/payment-status"],
    queryFn: async () => {
      const url = buildApiUrl("/api/payment-status");
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch payment statuses");
      return response.json();
    },
  });

  const statuses = statusesData?.data || [];

  // Fetch payable amount from Income & Expense (when creating new payment)
  const { data: incomeExpenseData, isLoading: isLoadingIncomeExpense } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/income-expense", carId, yearMonth],
    queryFn: async () => {
      if (!yearMonth) throw new Error("Year/Month not set");
      const [year, month] = yearMonth.split("-");
      const url = buildApiUrl(`/api/income-expense/${carId}/${year}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        // If income/expense not found, that's okay - admin will enter manually
        return { success: false, data: null };
      }
      return response.json();
    },
    enabled: !isEdit && !!yearMonth && !!carId,
  });

  // Initialize form with payment data (for edit mode)
  useEffect(() => {
    if (payment) {
      setYearMonth(payment.payments_year_month);
      setStatusId(payment.payments_status_id.toString());
      setPayable(payment.payments_amount.toString());
      setPayout(payment.payments_amount_payout.toString());
      setBalance(payment.payments_amount_balance.toString());
      setReferenceNumber(payment.payments_reference_number || "");
      
      // Format payment date for input field (YYYY-MM-DD)
      if (payment.payments_invoice_date) {
        const date = new Date(payment.payments_invoice_date);
        const formattedDate = date.toISOString().split('T')[0];
        setPaymentDate(formattedDate);
      } else {
        setPaymentDate("");
      }
      
      setRemarks(payment.payments_remarks || "");
      setReceiptFiles([]);
    } else {
      // Reset form for new payment
      const today = new Date();
      const defaultYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      setYearMonth(defaultYearMonth);
      setStatusId("");
      setPayable("0");
      setPayout("0");
      setBalance("0");
      setReferenceNumber("");
      setPaymentDate("");
      setRemarks("");
      setReceiptFiles([]);
    }
  }, [payment, isOpen]);

  // Auto-calculate balance when payout or payable changes
  useEffect(() => {
    const payoutNum = parseFloat(payout) || 0;
    const payableNum = parseFloat(payable) || 0;
    const balanceNum = payoutNum - payableNum;
    setBalance(balanceNum.toFixed(2));
  }, [payout, payable]);

  // Update payable when income/expense data is fetched
  useEffect(() => {
    if (incomeExpenseData?.success && incomeExpenseData?.data && !isEdit) {
      // Extract owner's split from income/expense data
      // This depends on your income/expense data structure
      // For now, set a placeholder - you'll need to adjust this based on actual data
      const ownerSplit = incomeExpenseData.data.owner_split || 0;
      setPayable(ownerSplit.toString());
    }
  }, [incomeExpenseData, isEdit]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setReceiptFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove file from list
  const handleRemoveFile = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = buildApiUrl("/api/payments");
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("paymentsClientId", data.paymentsClientId.toString());
      formData.append("paymentsStatusId", data.paymentsStatusId.toString());
      formData.append("paymentsCarId", data.paymentsCarId.toString());
      formData.append("paymentsYearMonth", data.paymentsYearMonth);
      formData.append("paymentsAmount", data.paymentsAmount.toString());
      formData.append("paymentsAmountPayout", data.paymentsAmountPayout.toString());
      formData.append("paymentsReferenceNumber", data.paymentsReferenceNumber || "");
      formData.append("paymentsInvoiceId", "");
      formData.append("paymentsInvoiceDate", data.paymentsInvoiceDate || "");
      formData.append("paymentsRemarks", data.paymentsRemarks || "");
      
      // Append receipt files
      if (data.receiptFiles && data.receiptFiles.length > 0) {
        data.receiptFiles.forEach((file: File) => {
          formData.append("receiptFiles", file);
        });
      }
      
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to create payment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/car", carId] });
      toast({
        title: "Success",
        description: "Payment created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!payment) throw new Error("No payment to update");
      const url = buildApiUrl(`/api/payments/${payment.payments_aid}`);
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("paymentsClientId", data.paymentsClientId.toString());
      formData.append("paymentsStatusId", data.paymentsStatusId.toString());
      formData.append("paymentsCarId", data.paymentsCarId.toString());
      formData.append("paymentsYearMonth", data.paymentsYearMonth);
      formData.append("paymentsAmount", data.paymentsAmount.toString());
      formData.append("paymentsAmountPayout", data.paymentsAmountPayout.toString());
      formData.append("paymentsReferenceNumber", data.paymentsReferenceNumber || "");
      formData.append("paymentsInvoiceId", "");
      formData.append("paymentsInvoiceDate", data.paymentsInvoiceDate || "");
      formData.append("paymentsRemarks", data.paymentsRemarks || "");
      
      // Append receipt files
      if (data.receiptFiles && data.receiptFiles.length > 0) {
        data.receiptFiles.forEach((file: File) => {
          formData.append("receiptFiles", file);
        });
      }
      
      const response = await fetch(url, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to update payment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/car", carId] });
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!yearMonth) {
      toast({
        title: "Validation Error",
        description: "Please select a year/month",
        variant: "destructive",
      });
      return;
    }

    if (!statusId) {
      toast({
        title: "Validation Error",
        description: "Please select a payment status",
        variant: "destructive",
      });
      return;
    }

    if (!clientId || clientId === 0) {
      toast({
        title: "Validation Error",
        description: "Client ID is missing. Please ensure the car has an associated client.",
        variant: "destructive",
      });
      return;
    }

    if (!carId || carId === 0) {
      toast({
        title: "Validation Error",
        description: "Car ID is missing.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      paymentsClientId: clientId,
      paymentsStatusId: parseInt(statusId),
      paymentsCarId: carId,
      paymentsYearMonth: yearMonth,
      paymentsAmount: parseFloat(payable) || 0,
      paymentsAmountPayout: parseFloat(payout) || 0,
      paymentsReferenceNumber: referenceNumber || "",
      paymentsInvoiceId: "",
      paymentsInvoiceDate: paymentDate || null,
      paymentsRemarks: remarks || "",
      receiptFiles: receiptFiles,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {isEdit ? "Update" : "Add"} Payment
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEdit
              ? "Update payment information"
              : "Create a new payment record"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Year/Month */}
          <div>
            <Label htmlFor="yearMonth" className="text-gray-300">
              Year/Month <span className="text-red-400">*</span>
            </Label>
            <Input
              id="yearMonth"
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              disabled={isPending || isEdit}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1"
              required
            />
          </div>

          {/* Payable Amount (Read-only or auto-filled) */}
          <div>
            <Label htmlFor="payable" className="text-gray-300">
              Payable (Owner's Split)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                $
              </span>
              <Input
                id="payable"
                type="number"
                step="0.01"
                value={payable}
                onChange={(e) => setPayable(e.target.value)}
                disabled={isPending || isLoadingIncomeExpense}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1 pl-8"
                placeholder="0.00"
              />
            </div>
            {isLoadingIncomeExpense && (
              <p className="text-xs text-gray-400 mt-1">
                Loading payable amount from Income & Expense...
              </p>
            )}
            {!isEdit && !isLoadingIncomeExpense && incomeExpenseData && !incomeExpenseData.success && (
              <p className="text-xs text-yellow-400 mt-1">
                Income & Expense not found for this month. Please enter manually.
              </p>
            )}
          </div>

          {/* Payout Amount */}
          <div>
            <Label htmlFor="payout" className="text-gray-300">
              Payout <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                $
              </span>
              <Input
                id="payout"
                type="number"
                step="0.01"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                disabled={isPending}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1 pl-8"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Balance (Read-only, auto-calculated) */}
          <div>
            <Label htmlFor="balance" className="text-gray-300">
              Balance (Payout - Payable)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                $
              </span>
              <Input
                id="balance"
                type="text"
                value={balance}
                disabled
                className="bg-[#0a0a0a] border-[#2a2a2a] text-[#EAEB80] font-bold mt-1 pl-8"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status" className="text-gray-300">
              Payment Status <span className="text-red-400">*</span>
            </Label>
            <Select value={statusId} onValueChange={setStatusId} disabled={isPending}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                {statuses.map((status) => (
                  <SelectItem
                    key={status.payment_status_aid}
                    value={status.payment_status_aid.toString()}
                  >
                    {status.payment_status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div>
            <Label htmlFor="referenceNumber" className="text-gray-300">
              Reference Number
            </Label>
            <Input
              id="referenceNumber"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={isPending}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1"
              placeholder="Enter reference number"
            />
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="paymentDate" className="text-gray-300">
              Payment Date
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={isPending}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <Label className="text-gray-300">Receipt Upload</Label>
            <div className="mt-2 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                disabled={isPending}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="w-full bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
              >
                <Upload className="w-4 h-4 mr-2" />
                {receiptFiles.length > 0 ? "Add More Files" : "Upload Receipt"}
              </Button>
              
              {receiptFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">
                    {receiptFiles.length} file(s) selected
                  </p>
                  {receiptFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-[#EAEB80] flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#EAEB80] flex-shrink-0" />
                        )}
                        <span className="text-sm text-white truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks" className="text-gray-300">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isPending}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white mt-1"
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[#2a2a2a]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
            >
              {isPending ? "Saving..." : isEdit ? "Update Payment" : "Create Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

