/**
 * Approval Dashboard for Expense Form Submissions
 * Admins can approve, decline, edit, and delete pending submissions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
const CATEGORY_LABELS: Record<string, string> = {
  directDelivery: "Direct Delivery",
  cogs: "COGS",
  reimbursedBills: "Reimbursed Bills",
  income: "Income",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface Submission {
  id: number;
  submissionDate: string;
  employeeId: number;
  carId: number;
  year: number;
  month: number;
  category: string;
  field: string;
  amount: number;
  receiptUrls: string[] | null;
  remarks: string | null;
  status: "pending" | "approved" | "declined";
  employeeName?: string;
  carDisplayName?: string;
  declineReason?: string | null;
  createdAt: string;
}

interface ExpenseFormApprovalDashboardProps {
  isAdmin?: boolean;
}

export default function ExpenseFormApprovalDashboard({ isAdmin = true }: ExpenseFormApprovalDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewReceiptsOpen, setViewReceiptsOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submissionToDecline, setSubmissionToDecline] = useState<Submission | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "/api/expense-form-submissions",
      statusFilter,
      page,
      limit,
      searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      const res = await fetch(
        buildApiUrl(`/api/expense-form-submissions?${params}`),
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch submissions");
      return json;
    },
  });

  const submissions: Submission[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination || { page: 1, total: 0, totalPages: 0 };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildApiUrl(`/api/expense-form-submissions/${id}/approve`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Expense submission approved and synced to Income & Expenses." });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-form-submissions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ id, declineReason }: { id: number; declineReason: string }) => {
      const res = await fetch(buildApiUrl(`/api/expense-form-submissions/${id}/decline`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ declineReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to decline");
      }
    },
    onSuccess: () => {
      toast({ title: "Declined", description: "Expense submission declined." });
      setDeclineModalOpen(false);
      setSubmissionToDecline(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/expense-form-submissions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildApiUrl(`/api/expense-form-submissions/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Expense submission deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-form-submissions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      const res = await fetch(buildApiUrl(`/api/expense-form-submissions/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Expense submission updated." });
      setEditModalOpen(false);
      setSelectedSubmission(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ["/api/expense-form-submissions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDecline = (sub: Submission) => {
    setSubmissionToDecline(sub);
    setDeclineReason("");
    setDeclineModalOpen(true);
  };

  const confirmDecline = () => {
    if (!submissionToDecline || !declineReason.trim()) {
      toast({ title: "Required", description: "Please enter a decline reason.", variant: "destructive" });
      return;
    }
    declineMutation.mutate({ id: submissionToDecline.id, declineReason: declineReason.trim() });
  };

  const handleEdit = (sub: Submission) => {
    setSelectedSubmission(sub);
    setEditForm({
      submissionDate: sub.submissionDate,
      amount: sub.amount,
      remarks: sub.remarks ?? "",
    });
    setEditModalOpen(true);
  };

  const confirmEdit = () => {
    if (!selectedSubmission) return;
    updateMutation.mutate({
      id: selectedSubmission.id,
      body: {
        submissionDate: editForm.submissionDate,
        amount: editForm.amount,
        remarks: editForm.remarks,
      },
    });
  };

  const formatFieldLabel = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search employee, car, VIN..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-[#111111] border-[#1a1a1a] text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-[#111111] border-[#1a1a1a] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-red-400">
          {error instanceof Error ? error.message : "Failed to load submissions."}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No expense submissions found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#2a2a2a]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Employee</TableHead>
                <TableHead className="text-gray-400">Car</TableHead>
                <TableHead className="text-gray-400">Year/Month</TableHead>
                <TableHead className="text-gray-400">Category</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400">Amount</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Remarks</TableHead>
                <TableHead className="text-gray-400">Decline Reason</TableHead>
                {isAdmin && <TableHead className="text-gray-400 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id} className="border-[#2a2a2a]">
                  <TableCell className="text-white text-sm">
                    {new Date(sub.submissionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-white text-sm">
                    {sub.employeeName || "-"}
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[200px] truncate" title={sub.carDisplayName}>
                    {sub.carDisplayName || "-"}
                  </TableCell>
                  <TableCell className="text-white text-sm">
                    {sub.year} / {MONTHS[sub.month - 1]}
                  </TableCell>
                  <TableCell className="text-white text-sm">
                    {CATEGORY_LABELS[sub.category] || sub.category}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {formatFieldLabel(sub.field)}
                  </TableCell>
                  <TableCell className="text-[#EAEB80] font-medium">
                    ${Number(sub.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        sub.status === "approved"
                          ? "border-green-600 text-green-400"
                          : sub.status === "declined"
                          ? "border-red-600 text-red-400"
                          : "border-[#EAEB80]/50 text-[#EAEB80]"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm max-w-[120px] truncate" title={sub.remarks || undefined}>
                    {sub.remarks || "—"}
                  </TableCell>
                  <TableCell className="text-red-400/80 text-sm max-w-[150px] truncate" title={sub.declineReason || undefined}>
                    {sub.status === "declined" && sub.declineReason ? sub.declineReason : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sub.receiptUrls && sub.receiptUrls.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-[#EAEB80]"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setViewReceiptsOpen(true);
                            }}
                            title="View receipts"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {sub.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-400"
                              onClick={() => approveMutation.mutate(sub.id)}
                              disabled={approveMutation.isPending}
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-400"
                              onClick={() => handleDecline(sub)}
                              title="Decline"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-[#EAEB80]"
                              onClick={() => handleEdit(sub)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-400"
                              onClick={() => {
                                if (window.confirm("Delete this submission?")) {
                                  deleteMutation.mutate(sub.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-[#2a2a2a] text-[#EAEB80]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-[#2a2a2a] text-[#EAEB80]"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View Receipts Dialog */}
      <Dialog open={viewReceiptsOpen} onOpenChange={setViewReceiptsOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#EAEB80]">Receipts</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.employeeName} - ${selectedSubmission?.amount?.toLocaleString()}
              {selectedSubmission?.remarks && ` • Remarks: ${selectedSubmission.remarks}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission?.status === "declined" && selectedSubmission?.declineReason && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <strong>Decline reason:</strong> {selectedSubmission.declineReason}
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            {selectedSubmission?.receiptUrls?.map((urlOrId, i) => {
              const isDriveFileId = urlOrId && !urlOrId.startsWith("http");
              const displayUrl = isDriveFileId
                ? buildApiUrl(`/api/expense-form-submissions/receipt/file?fileId=${encodeURIComponent(urlOrId)}`)
                : urlOrId;
              const isPdf = urlOrId?.match(/\.pdf$/i);
              return (
                <a
                  key={i}
                  href={displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {isPdf ? (
                    <span className="flex items-center gap-2 text-[#EAEB80] hover:underline">
                      <ExternalLink className="w-4 h-4" /> Receipt {i + 1} (PDF)
                    </span>
                  ) : isDriveFileId ? (
                    <span className="flex items-center gap-2 text-[#EAEB80] hover:underline">
                      <ExternalLink className="w-4 h-4" /> View Receipt {i + 1}
                    </span>
                  ) : (
                    <img
                      src={displayUrl}
                      alt={`Receipt ${i + 1}`}
                      className="max-h-48 rounded border border-[#2a2a2a] object-contain"
                    />
                  )}
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-[#EAEB80]">Decline Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining. This will be stored with the submission.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Decline reason (required)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="bg-[#0d0d0d] border-[#2a2a2a] text-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)} className="border-[#2a2a2a]">
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDecline}
              disabled={!declineReason.trim() || declineMutation.isPending}
            >
              {declineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-[#EAEB80]">Edit Submission</DialogTitle>
            <DialogDescription>
              Edit date, amount, or remarks. Other fields cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Date</label>
              <Input
                type="date"
                value={editForm.submissionDate || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, submissionDate: e.target.value }))}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.amount ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Remarks</label>
              <Input
                value={editForm.remarks ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, remarks: e.target.value }))}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-white mt-1"
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} className="border-[#2a2a2a]">
              Cancel
            </Button>
            <Button
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              onClick={confirmEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
