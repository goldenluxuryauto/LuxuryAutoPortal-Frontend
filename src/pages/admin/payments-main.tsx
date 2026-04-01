import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, FileText, Loader2, Upload, Download, List } from "lucide-react";
import { Label } from "@/components/ui/label";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddEditPaymentModal } from "@/components/modals/AddEditPaymentModal";
import { PaymentReceiptModal } from "@/components/modals/PaymentReceiptModal";

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
  payment_status_color: string;
  car_make_name: string;
  car_specs?: string;
  car_plate_number: string;
  car_vin_number: string;
  car_year: number;
  client_fname: string;
  client_lname: string;
  fullname: string;
}

interface PaymentStatus {
  payment_status_aid: number;
  payment_status_name: string;
  payment_status_color: string;
}

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `($ ${formatted})`;
  return `$ ${formatted}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatYearMonth = (yearMonth: string): string => {
  try {
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return yearMonth;
  }
};

const PAGE_LIMIT = 100;

export default function PaymentsMainPage() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [monthYear, setMonthYear] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteByMonthModalOpen, setIsDeleteByMonthModalOpen] = useState(false);
  const [isDeleteSingleModalOpen, setIsDeleteSingleModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteYearMonth, setDeleteYearMonth] = useState("");
  const [addYearMonth, setAddYearMonth] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    imported?: number;
    skipped?: number;
    errors?: string[];
  } | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
      setAllPayments([]);
    }, 400);
  }, []);

  // Reset pagination when filters change
  const resetPagination = useCallback(() => {
    setPage(1);
    setAllPayments([]);
  }, []);

  const { data: statusesData } = useQuery<{
    success: boolean;
    data: PaymentStatus[];
  }>({
    queryKey: ["/api/payment-status"],
    queryFn: async () => {
      const url = buildApiUrl("/api/payment-status");
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch payment statuses");
      return response.json();
    },
  });

  const statuses = statusesData?.data || [];
  const toPayStatus = statuses.filter((s) =>
    s.payment_status_name.toLowerCase().includes("to pay")
  );

  const { data: paymentsData, isLoading: isLoadingPayments, isFetching } = useQuery<{
    success: boolean;
    data: Payment[];
    total: number;
    page: number;
    count: number;
  }>({
    queryKey: ["/api/payments/search", filterStatus, monthYear, debouncedSearch, page],
    queryFn: async () => {
      const url = buildApiUrl("/api/payments/search");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchValue: debouncedSearch || undefined,
          monthYear: monthYear || undefined,
          status: filterStatus || undefined,
          page,
          limit: PAGE_LIMIT,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
  });

  // Append new page results or replace on filter change
  useEffect(() => {
    if (paymentsData?.data) {
      if (page === 1) {
        setAllPayments(paymentsData.data);
      } else {
        setAllPayments((prev) => [...prev, ...paymentsData.data]);
      }
      setTotalCount(paymentsData.total ?? paymentsData.count ?? 0);
    }
  }, [paymentsData, page]);

  const payments = allPayments;
  const hasMore = payments.length < totalCount;

  const totals = payments.reduce(
    (acc, p) => ({
      payable: acc.payable + Number(p.payments_amount || 0),
      payout: acc.payout + Number(p.payments_amount_payout || 0),
      balance:
        acc.balance +
        (Number(p.payments_amount_payout || 0) - Number(p.payments_amount || 0)),
    }),
    { payable: 0, payout: 0, balance: 0 }
  );

  const createByMonthMutation = useMutation({
    mutationFn: async (yearMonth: string) => {
      const url = buildApiUrl("/api/payments/create-by-month");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments_year_month: yearMonth, includeInactive: true }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || "Failed to create payments");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/search"] });
      resetPagination();
      toast({
        title: "Success",
        description: data.message || "Payments created successfully",
      });
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteByMonthMutation = useMutation({
    mutationFn: async (yearMonth: string) => {
      const url = buildApiUrl("/api/payments/delete-by-year-month");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments_year_month: yearMonth }),
      });
      if (!response.ok) throw new Error("Failed to delete payments");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/search"] });
      resetPagination();
      toast({
        title: "Success",
        description: "Payments deleted successfully",
      });
      setIsDeleteByMonthModalOpen(false);
      setDeleteYearMonth("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildApiUrl(`/api/payments/${id}`);
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/search"] });
      resetPagination();
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      setIsDeleteSingleModalOpen(false);
      setSelectedPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const url = buildApiUrl("/api/payments/import");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to import payments");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/search"] });
      resetPagination();
      setImportResult({
        imported: data.imported ?? data.count ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      toast({
        title: "Import Complete",
        description: `${data.imported ?? data.count ?? 0} payment(s) imported`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatVehicleInfo = (p: Payment) => {
    const name = `${p.car_make_name || ""} ${p.car_year || ""}`.trim();
    const plate = p.car_plate_number ? `#${p.car_plate_number.trim()}` : "";
    const vin = p.car_vin_number ? p.car_vin_number.trim() : "";
    return [name, plate, vin].filter(Boolean).join(" - ");
  };

  const formatClientName = (p: Payment) => {
    if (p.client_lname && p.client_fname) {
      return `${p.client_lname}, ${p.client_fname}`;
    }
    return p.fullname || "";
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-foreground">Payments</h4>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/80"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDeleteByMonthModalOpen(true)}
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  resetPagination();
                }}
                className="h-9 px-3 rounded-md border border-border bg-card text-foreground text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All</option>
                <option value="Unpaid">Unpaid</option>
                <option value="To Pay">To Pay</option>
                <option value="Paid">Paid</option>
                <option value="On Hold">On Hold</option>
                <option value="No Payout">No Payout</option>
                <option value="In Review">In Review</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-sm block mb-1">Month</label>
              <input
                type="month"
                value={monthYear}
                onChange={(e) => {
                  setMonthYear(e.target.value);
                  resetPagination();
                }}
                className="h-9 px-3 rounded-md border border-border bg-card text-foreground text-sm outline-none focus:ring-1 focus:ring-primary [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="flex items-center gap-1.5 h-9">
              <List className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{totalCount}</span>
            </div>
          </div>
          <div className="flex items-end gap-2 sm:ml-auto">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">Client Search</label>
              <input
                type="text"
                placeholder="Search by client name..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 px-3 rounded-md border border-border bg-card text-foreground text-sm outline-none focus:ring-1 focus:ring-primary w-[220px] placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-auto flex-1">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-left text-foreground font-medium w-12 text-xs">#</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-24 text-xs">Status</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-36 text-xs">Client</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-28 whitespace-nowrap text-xs">Date</TableHead>
                  <TableHead className="text-left text-foreground font-medium min-w-[180px] text-xs">Car</TableHead>
                  <TableHead className="text-right text-foreground font-medium w-32 tabular-nums text-xs whitespace-nowrap">Payable</TableHead>
                  <TableHead className="text-right text-foreground font-medium w-32 tabular-nums text-xs whitespace-nowrap">Payout</TableHead>
                  <TableHead className="text-right text-foreground font-medium w-32 tabular-nums text-xs whitespace-nowrap">Balance</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-24 text-xs">Ref #</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-24 text-xs">Invoice #</TableHead>
                  <TableHead className="text-left text-foreground font-medium w-28 whitespace-nowrap text-xs">Payment Date</TableHead>
                  <TableHead className="text-center text-foreground font-medium w-24 text-xs">Receipt</TableHead>
                  <TableHead className="text-left text-foreground font-medium min-w-[100px] text-xs">Remarks</TableHead>
                  <TableHead className="text-center text-foreground font-medium w-32 text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments && page === 1 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : payments.length > 0 ? (
                  <>
                    {payments.map((payment, index) => {
                      const balance =
                        Number(payment.payments_amount_payout || 0) -
                        Number(payment.payments_amount || 0);
                      return (
                        <TableRow
                          key={payment.payments_aid}
                          className="border-border hover:bg-card"
                        >
                          <TableCell className="text-muted-foreground w-12 text-xs">{index + 1}.</TableCell>
                          <TableCell className="w-24">
                            <Badge
                              style={{
                                backgroundColor: payment.payment_status_color,
                                color: "#000",
                              }}
                              className="text-[10px] font-medium"
                            >
                              {payment.payment_status_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground w-36 text-xs">{formatClientName(payment)}</TableCell>
                          <TableCell className="w-28 whitespace-nowrap text-muted-foreground text-xs">{formatYearMonth(payment.payments_year_month)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs min-w-[180px]">
                            {formatVehicleInfo(payment)}
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium w-32 tabular-nums text-xs whitespace-nowrap">
                            {formatCurrency(Number(payment.payments_amount || 0))}
                            <span className="text-muted-foreground text-[10px] ml-1 cursor-pointer hover:text-primary" title="Payment breakdown details">
                              details
                            </span>
                          </TableCell>
                          <TableCell className="text-right w-32 tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                            {formatCurrency(Number(payment.payments_amount_payout || 0))}
                          </TableCell>
                          <TableCell className="text-right w-32 tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell className="text-muted-foreground w-24 text-xs">{payment.payments_reference_number || ""}</TableCell>
                          <TableCell className="text-muted-foreground w-24 text-xs">{payment.payments_invoice_id || ""}</TableCell>
                          <TableCell className="text-muted-foreground w-28 whitespace-nowrap text-xs">{formatDate(payment.payments_invoice_date)}</TableCell>
                          <TableCell className="text-center w-24">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsReceiptModalOpen(true);
                              }}
                              className="text-muted-foreground hover:text-primary text-xs gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Receipt
                            </Button>
                          </TableCell>
                          <TableCell className="min-w-[100px] max-w-[150px] truncate text-muted-foreground text-xs">
                            {payment.payments_remarks || ""}
                          </TableCell>
                          <TableCell className="text-center w-32">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsEditModalOpen(true);
                                }}
                                className="text-muted-foreground hover:text-primary text-xs"
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsDeleteSingleModalOpen(true);
                                }}
                                className="text-muted-foreground hover:text-red-700 text-xs"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 border-border bg-card/50">
                      <TableCell colSpan={5} className="text-right font-bold text-foreground pr-4">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary w-32 tabular-nums whitespace-nowrap">
                        {formatCurrency(totals.payable)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary w-32 tabular-nums whitespace-nowrap">
                        {formatCurrency(totals.payout)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary w-32 tabular-nums whitespace-nowrap">
                        {formatCurrency(totals.balance)}
                      </TableCell>
                      <TableCell colSpan={6}></TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isFetching}
              className="bg-card border-border text-foreground hover:bg-card/80"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Load more
            </Button>
          </div>
        )}

        {/* Add Payments Dialog */}
        {isAddModalOpen && (
          <Dialog open={true} onOpenChange={() => setIsAddModalOpen(false)}>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Add Payments</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Select a month to create payments for all active client-car pairs. This
                  pulls car owner split from income/expense data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Month</label>
                  <Input
                    type="month"
                    value={addYearMonth}
                    onChange={(e) => setAddYearMonth(e.target.value)}
                    className="bg-card border-border text-foreground [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert"
                  />
                </div>
                {toPayStatus.length === 0 && (
                  <p className="text-red-700 text-sm">
                    Warning: Payment status &quot;To Pay&quot; is required. Please configure
                    it in Payment Status settings.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-card border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (addYearMonth) {
                      createByMonthMutation.mutate(addYearMonth);
                      setAddYearMonth("");
                    } else {
                      toast({ title: "Error", description: "Please select a month", variant: "destructive" });
                    }
                  }}
                  disabled={createByMonthMutation.isPending || toPayStatus.length === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  {createByMonthMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Payment Modal */}
        {isEditModalOpen && selectedPayment && (
          <AddEditPaymentModal
            isOpen={true}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
            carId={selectedPayment.payments_car_id}
            clientId={selectedPayment.payments_client_id}
          />
        )}

        {/* Delete by Month Dialog */}
        {isDeleteByMonthModalOpen && (
          <Dialog
            open={isDeleteByMonthModalOpen}
            onOpenChange={setIsDeleteByMonthModalOpen}
          >
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Delete Payments by Month</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  This will delete all payments for the selected month. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Month</label>
                  <Input
                    type="month"
                    value={deleteYearMonth}
                    onChange={(e) => setDeleteYearMonth(e.target.value)}
                    className="bg-card border-border text-foreground [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteByMonthModalOpen(false)}
                  className="bg-card border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    deleteYearMonth && deleteByMonthMutation.mutate(deleteYearMonth)
                  }
                  disabled={!deleteYearMonth || deleteByMonthMutation.isPending}
                  className="bg-red-500/20 text-red-700 border-red-500/50 hover:bg-red-500/30"
                >
                  {deleteByMonthMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Single Payment Dialog */}
        {isDeleteSingleModalOpen && selectedPayment && (
          <Dialog
            open={isDeleteSingleModalOpen}
            onOpenChange={setIsDeleteSingleModalOpen}
          >
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Delete Payment</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Are you sure you want to delete this payment?
                  <div className="mt-4 p-4 bg-card rounded-md">
                    <p>
                      <span className="text-muted-foreground">Date:</span>{" "}
                      {formatYearMonth(selectedPayment.payments_year_month)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Amount:</span>{" "}
                      {formatCurrency(selectedPayment.payments_amount)}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteSingleModalOpen(false)}
                  className="bg-card border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteSingleMutation.mutate(selectedPayment.payments_aid)}
                  disabled={deleteSingleMutation.isPending}
                  className="bg-red-500/20 text-red-700 border-red-500/50 hover:bg-red-500/30"
                >
                  {deleteSingleMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Receipt Modal */}
        {isReceiptModalOpen && selectedPayment && (
          <PaymentReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => {
              setIsReceiptModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />
        )}

        {/* Import Modal (kept but button hidden) */}
        {isImportModalOpen && (
          <Dialog open={true} onOpenChange={() => setIsImportModalOpen(false)}>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Import Payments</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Upload a CSV file to import payment records in bulk.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <a
                    href={buildApiUrl("/api/payments/import-template")}
                    className="inline-flex items-center gap-2 text-sm text-[#EAEB80] hover:text-[#d4d570] hover:underline"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Download CSV Template
                  </a>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground block mb-2">
                    CSV File
                  </Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setImportFile(e.target.files?.[0] || null);
                      setImportResult(null);
                    }}
                    className="bg-card border-border text-foreground file:text-foreground file:bg-muted file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer"
                  />
                </div>
                {importResult && (
                  <div className="p-3 rounded-md bg-muted/50 border border-border text-sm space-y-1">
                    <p className="text-foreground">
                      Imported: <span className="text-[#EAEB80] font-medium">{importResult.imported ?? 0}</span>
                    </p>
                    <p className="text-foreground">
                      Skipped: <span className="text-muted-foreground font-medium">{importResult.skipped ?? 0}</span>
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-700 font-medium mb-1">Errors:</p>
                        <ul className="list-disc list-inside text-red-700/80 max-h-32 overflow-y-auto">
                          {importResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsImportModalOpen(false)}
                  className="bg-card border-border text-foreground"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (importFile) {
                      importMutation.mutate(importFile);
                    } else {
                      toast({
                        title: "Error",
                        description: "Please select a CSV file",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!importFile || importMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
