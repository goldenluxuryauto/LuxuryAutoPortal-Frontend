/**
 * Employee Form: Income & Expense Receipt Submission
 * Allows employees/staff to submit expense receipts for: Direct Delivery, COGS, Reimbursed Bills
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Upload, Loader2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  directDelivery: "Operating Expenses (Direct Delivery)",
  cogs: "Operating Expenses (COGS - Per Vehicle)",
  reimbursedBills: "Reimbursed and Non-Reimbursed Bills",
  income: "Income",
};

export default function ExpenseFormSubmission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    submissionDate: new Date().toISOString().slice(0, 10),
    employeeId: "",
    carId: "",
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    category: "directDelivery",
    field: "",
    amount: "",
    remarks: "",
  });
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  const { data: optionsData, isLoading: optionsLoading } = useQuery({
    queryKey: ["/api/expense-form-submissions/options"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/expense-form-submissions/options"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch options");
      return res.json();
    },
  });

  const options = optionsData?.data || {};
  const employees = options.employees || [];
  const cars = options.cars || [];
  const currentEmployeeId = options.currentEmployeeId ?? null;
  const currentUser = options.currentUser || null;
  const isAdmin = options.isAdmin === true;
  const isEmployee = options.isEmployee === true;
  const isEmployeeOnly = isEmployee && !isAdmin && !!currentEmployeeId;
  const currentEmployeeName =
    isEmployeeOnly && currentEmployeeId
      ? (employees.find((e: { id: number }) => e.id === currentEmployeeId)?.name ?? currentUser?.displayName ?? "")
      : "";
  const categoryFields: Record<string, { value: string; label: string }[]> =
    options.categoryFields || {};
  const fieldOptions = categoryFields[formData.category] || [];

  useEffect(() => {
    setFormData((prev) => ({ ...prev, field: "" }));
  }, [formData.category]);

  // Default Employee Name to current user/account owner (client requirement)
  // Use optionsData as dep only (avoid employees - new [] ref each render when loading)
  useEffect(() => {
    if (!currentEmployeeId || !optionsData?.data) return;
    const list = optionsData.data.employees || [];
    const id = String(currentEmployeeId);
    const exists = list.some((e: { id: number }) => String(e.id) === id);
    if (!exists) return;
    setFormData((prev) => (prev.employeeId === id ? prev : { ...prev, employeeId: id }));
  }, [currentEmployeeId, optionsData]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const receiptUrls: string[] = [];
      if (receiptFiles.length > 0 && formData.employeeId) {
        const fd = new FormData();
        receiptFiles.forEach((file) => fd.append("receipts", file));
        fd.append("employeeId", formData.employeeId);
        const uploadRes = await fetch(buildApiUrl("/api/expense-form-submissions/receipts/upload"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Failed to upload receipt");
        }
        const uploadData = await uploadRes.json();
        if (uploadData.fileIds?.length) {
          receiptUrls.push(...uploadData.fileIds);
        }
      }
      const res = await fetch(buildApiUrl("/api/expense-form-submissions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          submissionDate: formData.submissionDate,
          employeeId: parseInt(formData.employeeId),
          carId: parseInt(formData.carId),
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          category: formData.category,
          field: formData.field,
          amount: parseFloat(formData.amount),
          receiptUrls: receiptUrls.length ? receiptUrls : undefined,
          remarks: formData.remarks || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Submitted",
        description: "Expense receipt form submitted successfully. Awaiting admin approval.",
      });
      setFormData({
        submissionDate: new Date().toISOString().slice(0, 10),
        employeeId: isEmployeeOnly && currentEmployeeId ? String(currentEmployeeId) : "",
        carId: "",
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString(),
        category: "directDelivery",
        field: "",
        amount: "",
        remarks: "",
      });
      setReceiptFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/expense-form-submissions"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.employeeId ||
      !formData.carId ||
      !formData.field ||
      !formData.amount ||
      parseFloat(formData.amount) <= 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (optionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
      </div>
    );
  }

  return (
    <Card className="bg-[#0d0d0d] border-[#2a2a2a]">
      <CardHeader>
        <CardTitle className="text-[#EAEB80] flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Income & Expense Receipt Submission
        </CardTitle>
        <p className="text-sm text-gray-400">
          Submit expense receipts for Operating Expenses (Direct Delivery), COGS, or Reimbursed Bills.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Date *</Label>
              <Input
                type="date"
                value={formData.submissionDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, submissionDate: e.target.value }))
                }
                className="bg-[#111111] border-[#2a2a2a] text-white mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-gray-400">Employee Name *</Label>
              {isEmployeeOnly ? (
                <Input
                  readOnly
                  value={currentEmployeeName}
                  className="bg-[#111111] border-[#2a2a2a] text-white mt-1 cursor-default"
                  title="Your name (pre-filled for employee accounts)"
                />
              ) : (
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, employeeId: v }))}
                >
                  <SelectTrigger className="bg-[#111111] border-[#2a2a2a] text-white mt-1">
                    <SelectValue
                      placeholder={
                        currentUser?.displayName
                          ? `Select employee (defaults to ${currentUser.displayName})`
                          : "Select employee"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: { id: number; name: string }) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label className="text-gray-400">Car *</Label>
            <Select
              value={formData.carId}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, carId: v }))}
            >
              <SelectTrigger className="bg-[#111111] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Select car (Make Model Year - Plate - VIN)" />
              </SelectTrigger>
              <SelectContent>
                {cars.map((car: { id: number; name: string; displayName?: string }) => (
                  <SelectItem key={car.id} value={String(car.id)}>
                    {car.displayName ?? car.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-400">Year</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData((prev) => ({ ...prev, year: e.target.value }))}
                className="bg-[#111111] border-[#2a2a2a] text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400">Month</Label>
              <Select
                value={formData.month}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, month: v }))}
              >
                <SelectTrigger className="bg-[#111111] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                className="bg-[#111111] border-[#2a2a2a] text-white mt-1"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-400">Expense Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, category: v, field: "" }))
              }
            >
              <SelectTrigger className="bg-[#111111] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="directDelivery">
                  {CATEGORY_LABELS.directDelivery}
                </SelectItem>
                <SelectItem value="cogs">{CATEGORY_LABELS.cogs}</SelectItem>
                <SelectItem value="reimbursedBills">
                  {CATEGORY_LABELS.reimbursedBills}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400">Expense Type *</Label>
            <Select
              value={formData.field}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, field: v }))}
            >
              <SelectTrigger className="bg-[#111111] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((f: { value: string; label: string }) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400">Upload Receipts</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setReceiptFiles((prev) => [...prev, ...files]);
                }}
                className="bg-[#111111] border-[#2a2a2a] text-white"
              />
              <Upload className="w-4 h-4 text-gray-500" />
            </div>
            {receiptFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {receiptFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label className="text-gray-400">Remarks</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              className="bg-[#111111] border-[#2a2a2a] text-white mt-1 min-h-[80px]"
              placeholder="Optional notes..."
            />
          </div>

          <Button
            type="submit"
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
