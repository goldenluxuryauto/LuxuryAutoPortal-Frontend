import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Edit, FileText, HandCoins, Loader2 } from "lucide-react";
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

export default function PaymentsMainPage() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [clientInputVal, setClientInputVal] = useState<string>("");
  const [isFilter, setIsFilter] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteByMonthModalOpen, setIsDeleteByMonthModalOpen] = useState(false);
  const [isDeleteSingleModalOpen, setIsDeleteSingleModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteYearMonth, setDeleteYearMonth] = useState("");
  const [addYearMonth, setAddYearMonth] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hasFilters = !!filterStatus || !!monthFilter || !!clientSearch;

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

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery<{
    success: boolean;
    data: Payment[];
    total: number;
    page: number;
    count: number;
  }>({
    queryKey: ["/api/payments/search", clientSearch, filterStatus, monthFilter],
    queryFn: async () => {
      const url = buildApiUrl("/api/payments/search");
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchValue: clientSearch,
          status: filterStatus || undefined,
          monthYear: monthFilter || undefined,
          page: 1,
          limit: 100,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
  });

  const payments = paymentsData?.data || [];

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
        body: JSON.stringify({ payments_year_month: yearMonth }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || "Failed to create payments");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/search"] });
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

  const handleClearFilters = () => {
    setFilterStatus("");
    setMonthFilter("");
    setClientSearch("");
    setClientInputVal("");
    setIsFilter(false);
  };

  const handleClientSearchChange = (val: string) => {
    setClientInputVal(val);
    const t = setTimeout(() => {
      setClientSearch(val);
      setIsFilter(true);
      clearTimeout(t);
    }, 500);
  };

  const formatVehicleInfo = (p: Payment) =>
    `${p.car_make_name || ""} ${p.car_specs || ""} ${p.car_year || ""}`.trim() +
    (p.car_plate_number ? ` - #${p.car_plate_number.trim()}` : "") +
    (p.car_vin_number ? ` - ${p.car_vin_number.trim()}` : "");

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage client payments across all cars
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Status</label>
              <Select
                value={filterStatus || "__all__"}
                onValueChange={(v) => {
                  setFilterStatus(v === "__all__" ? "" : v);
                  setIsFilter(true);
                }}
              >
                <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="__all__">All</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.payment_status_aid} value={s.payment_status_name}>
                      {s.payment_status_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Month</label>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setIsFilter(true);
                }}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[180px] [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Client Search</label>
              <Input
                type="search"
                placeholder="Search client..."
                value={clientInputVal}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[180px]"
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-6"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">
              Total: {paymentsData?.total ?? payments.length}
            </span>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteByMonthModalOpen(true)}
              className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-auto flex-1">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                  <TableHead className="text-left text-[#EAEB80] font-medium w-12">#</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-24">Status</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-36">Client</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-28 whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium min-w-[180px]">Car</TableHead>
                  <TableHead className="text-right text-[#EAEB80] font-medium w-24 tabular-nums">Payable</TableHead>
                  <TableHead className="text-right text-[#EAEB80] font-medium w-24 tabular-nums">Payout</TableHead>
                  <TableHead className="text-right text-[#EAEB80] font-medium w-24 tabular-nums">Balance</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-24">Ref #</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-24">Invoice #</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium w-28 whitespace-nowrap">Payment Date</TableHead>
                  <TableHead className="text-center text-[#EAEB80] font-medium w-16">Receipt</TableHead>
                  <TableHead className="text-left text-[#EAEB80] font-medium min-w-[100px]">Remarks</TableHead>
                  <TableHead className="text-center text-[#EAEB80] font-medium w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-gray-500">
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
                          className="border-[#2a2a2a] hover:bg-[#1a1a1a]"
                        >
                          <TableCell className="text-gray-300 w-12">{index + 1}.</TableCell>
                          <TableCell className="w-24">
                            <Badge
                              style={{
                                backgroundColor: payment.payment_status_color,
                                color: "#000",
                              }}
                              className="text-xs font-medium"
                            >
                              {payment.payment_status_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white w-36">{payment.fullname}</TableCell>
                          <TableCell className="w-28 whitespace-nowrap text-gray-400">{formatYearMonth(payment.payments_year_month)}</TableCell>
                          <TableCell className="text-gray-400 text-sm min-w-[180px]">
                            {formatVehicleInfo(payment)}
                          </TableCell>
                          <TableCell className="text-right text-[#EAEB80] font-medium w-24 tabular-nums">
                            {formatCurrency(Number(payment.payments_amount || 0))}
                          </TableCell>
                          <TableCell className="text-right w-24 tabular-nums text-gray-300">
                            {formatCurrency(Number(payment.payments_amount_payout || 0))}
                          </TableCell>
                          <TableCell className="text-right w-24 tabular-nums text-gray-300">
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell className="text-gray-400 w-24">{payment.payments_reference_number || "--"}</TableCell>
                          <TableCell className="text-gray-400 w-24">{payment.payments_invoice_id || "--"}</TableCell>
                          <TableCell className="text-gray-400 w-28 whitespace-nowrap">{formatDate(payment.payments_invoice_date)}</TableCell>
                          <TableCell className="text-center w-16">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsReceiptModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-[#EAEB80]"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="min-w-[100px] max-w-[150px] truncate text-gray-400">
                            {payment.payments_remarks || "--"}
                          </TableCell>
                          <TableCell className="text-center w-24">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsEditModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-[#EAEB80]"
                                title="Edit"
                              >
                                <HandCoins className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsDeleteSingleModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 border-[#2a2a2a] bg-[#1a1a1a]/50">
                      <TableCell colSpan={5} className="text-right font-bold text-white pr-4">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#EAEB80] w-24 tabular-nums">
                        {formatCurrency(totals.payable)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#EAEB80] w-24 tabular-nums">
                        {formatCurrency(totals.payout)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#EAEB80] w-24 tabular-nums">
                        {formatCurrency(totals.balance)}
                      </TableCell>
                      <TableCell colSpan={6}></TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-gray-500">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {isAddModalOpen && (
          <Dialog open={true} onOpenChange={() => setIsAddModalOpen(false)}>
            <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white">
              <DialogHeader>
                <DialogTitle>Add Payments</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Select a month to create payments for all active client-car pairs. This
                  pulls car owner split from income/expense data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Month</label>
                  <Input
                    type="month"
                    value={addYearMonth}
                    onChange={(e) => setAddYearMonth(e.target.value)}
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert"
                  />
                </div>
                {toPayStatus.length === 0 && (
                  <p className="text-red-400 text-sm">
                    Warning: Payment status &quot;To Pay&quot; is required. Please configure
                    it in Payment Status settings.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
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
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
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

        {isDeleteByMonthModalOpen && (
          <Dialog
            open={isDeleteByMonthModalOpen}
            onOpenChange={setIsDeleteByMonthModalOpen}
          >
            <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white">
              <DialogHeader>
                <DialogTitle>Delete Payments by Month</DialogTitle>
                <DialogDescription className="text-gray-400">
                  This will delete all payments for the selected month. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Month</label>
                  <Input
                    type="month"
                    value={deleteYearMonth}
                    onChange={(e) => setDeleteYearMonth(e.target.value)}
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white [&::-webkit-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteByMonthModalOpen(false)}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    deleteYearMonth && deleteByMonthMutation.mutate(deleteYearMonth)
                  }
                  disabled={!deleteYearMonth || deleteByMonthMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
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

        {isDeleteSingleModalOpen && selectedPayment && (
          <Dialog
            open={isDeleteSingleModalOpen}
            onOpenChange={setIsDeleteSingleModalOpen}
          >
            <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white">
              <DialogHeader>
                <DialogTitle>Delete Payment</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this payment?
                  <div className="mt-4 p-4 bg-[#1a1a1a] rounded-md">
                    <p>
                      <span className="text-gray-400">Date:</span>{" "}
                      {formatYearMonth(selectedPayment.payments_year_month)}
                    </p>
                    <p>
                      <span className="text-gray-400">Amount:</span>{" "}
                      {formatCurrency(selectedPayment.payments_amount)}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteSingleModalOpen(false)}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteSingleMutation.mutate(selectedPayment.payments_aid)}
                  disabled={deleteSingleMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteSingleMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
      </div>
    </AdminLayout>
  );
}
