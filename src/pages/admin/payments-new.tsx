import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ArrowLeft, Plus, Trash2, Edit, FileText, X } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";
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

interface CarDetail {
  id: number;
  vin: string;
  makeModel: string;
  licensePlate?: string;
  year?: number;
  mileage: number;
  status: "ACTIVE" | "INACTIVE";
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
  } | null;
}

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
  car_make_model: string;
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
  payment_status_is_active: number;
}

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value < 0) {
    return `($ ${formatted})`;
  }
  return `$ ${formatted}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

const formatYearMonth = (yearMonth: string): string => {
  try {
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  } catch {
    return yearMonth;
  }
};

export default function PaymentsPage() {
  const [, params] = useRoute("/admin/cars/:id/payments");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user data to check role
  const { data: userData } = useQuery<{ user?: any }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/auth/me"), { credentials: "include" });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const user = userData?.user;
  const isAdmin = user?.isAdmin === true;
  const isClient = user?.isClient === true;

  // Fetch car data
  const { data: carData, isLoading, error } = useQuery<{
    success: boolean;
    data: CarDetail;
  }>({
    queryKey: ["/api/cars", carId],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const url = buildApiUrl(`/api/cars/${carId}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch car");
      return response.json();
    },
    enabled: !!carId,
    retry: false,
  });

  const car = carData?.data;

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

  // Fetch payments for this car
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery<{
    success: boolean;
    data: Payment[];
    count: number;
  }>({
    queryKey: ["/api/payments/car", carId, filterStatus, monthFilter],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      let url = buildApiUrl(`/api/payments/car/${carId}`);
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== "All") {
        params.append("status", filterStatus);
      }
      if (monthFilter) {
        params.append("yearMonth", monthFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
    enabled: !!carId,
  });

  const payments = paymentsData?.data || [];

  // Calculate totals
  const totals = payments.reduce(
    (acc, payment) => ({
      payable: acc.payable + parseFloat(payment.payments_amount.toString()),
      payout: acc.payout + parseFloat(payment.payments_amount_payout.toString()),
      balance: acc.balance + parseFloat(payment.payments_amount_balance.toString()),
    }),
    { payable: 0, payout: 0, balance: 0 }
  );

  // Delete mutation
  const deleteMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/payments/car", carId] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      setIsDeleteModalOpen(false);
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsEditModalOpen(true);
  };

  const handleDelete = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };

  const handleReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  const handleClearFilters = () => {
    setFilterStatus("All");
    setMonthFilter("");
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <CarDetailSkeleton />
      </AdminLayout>
    );
  }

  if (error || !car) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-400">Failed to load car details</p>
          <button
            onClick={() => setLocation("/cars")}
            className="mt-4 text-[#EAEB80] hover:underline"
          >
            ← Back to Cars
          </button>
        </div>
      </AdminLayout>
    );
  }

  const carName = car.makeModel || `${car.year || ""} ${car.vin}`.trim();
  const ownerName = car.owner
    ? `${car.owner.firstName} ${car.owner.lastName}`
    : "N/A";

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to View Car</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Payment History</h1>
              {car && (
                <p className="text-sm text-gray-400 mt-1">
                  Car: {carName} - Owner: {ownerName}
                </p>
              )}
            </div>
            {isAdmin && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            )}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-auto flex-1">
          <div className="p-4 sm:p-6">
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm">Status:</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[140px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <SelectItem value="All">All</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.payment_status_aid} value={status.payment_status_name}>
                        {status.payment_status_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm">Month:</label>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[180px]"
                />
              </div>

              {(filterStatus !== "All" || monthFilter) && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  Clear Filters
                </Button>
              )}

              <div className="flex items-center gap-2 text-gray-400 ml-auto">
                <span className="text-sm">Total: {payments.length}</span>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                    <TableHead className="text-left text-[#EAEB80] font-medium w-12">#</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Status</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Date</TableHead>
                    <TableHead className="text-right text-[#EAEB80] font-medium">Payable</TableHead>
                    <TableHead className="text-right text-[#EAEB80] font-medium">Payout</TableHead>
                    <TableHead className="text-right text-[#EAEB80] font-medium">Balance</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Ref #</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Invoice #</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Payment Date</TableHead>
                    <TableHead className="text-center text-[#EAEB80] font-medium">Receipt</TableHead>
                    {isAdmin && (
                      <TableHead className="text-center text-[#EAEB80] font-medium">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayments ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-gray-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : payments.length > 0 ? (
                    <>
                      {payments.map((payment, index) => (
                        <TableRow
                          key={payment.payments_aid}
                          className="border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <TableCell className="text-left text-gray-300">
                            {index + 1}.
                          </TableCell>
                          <TableCell className="text-left">
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
                          <TableCell className="text-left text-white">
                            {formatYearMonth(payment.payments_year_month)}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {formatCurrency(payment.payments_amount)}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {formatCurrency(payment.payments_amount_payout)}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {formatCurrency(payment.payments_amount_balance)}
                          </TableCell>
                          <TableCell className="text-left text-gray-400">
                            {payment.payments_reference_number || "--"}
                          </TableCell>
                          <TableCell className="text-left text-gray-400">
                            {payment.payments_invoice_id || "--"}
                          </TableCell>
                          <TableCell className="text-left text-gray-400">
                            {formatDate(payment.payments_invoice_date)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReceipt(payment)}
                              className="text-gray-400 hover:text-[#EAEB80]"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(payment)}
                                  className="text-gray-400 hover:text-[#EAEB80]"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(payment)}
                                  className="text-gray-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="border-t-2 border-[#2a2a2a] bg-[#1a1a1a]/50">
                        <TableCell colSpan={3} className="text-right font-bold text-white">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#EAEB80]">
                          {formatCurrency(totals.payable)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#EAEB80]">
                          {formatCurrency(totals.payout)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#EAEB80]">
                          {formatCurrency(totals.balance)}
                        </TableCell>
                        <TableCell colSpan={isAdmin ? 5 : 4}></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-gray-500">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Add/Edit Payment Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <AddEditPaymentModal
            isOpen={isAddModalOpen || isEditModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
            carId={carId || 0}
            clientId={car?.owner ? parseInt(String((car.owner as any).id || 0)) : 0}
          />
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedPayment && (
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="bg-[#0f0f0f] border-[#2a2a2a] text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Payment</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this payment record?
                  <div className="mt-4 p-4 bg-[#1a1a1a] rounded-md">
                    <p className="text-white">
                      <span className="text-gray-400">Date:</span> {formatYearMonth(selectedPayment.payments_year_month)}
                    </p>
                    <p className="text-white">
                      <span className="text-gray-400">Amount:</span> {formatCurrency(selectedPayment.payments_amount)}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border-[#2a2a2a]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(selectedPayment.payments_aid)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
      </div>
    </AdminLayout>
  );
}

