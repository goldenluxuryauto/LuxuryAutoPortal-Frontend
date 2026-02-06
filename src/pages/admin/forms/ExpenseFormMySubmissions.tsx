/**
 * Read-only view of current user's expense form submissions
 * Shown to employees (and admins) to track their own submissions
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, Eye, ExternalLink } from "lucide-react";

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

function formatFieldLabel(field: string) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export default function ExpenseFormMySubmissions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewReceiptsOpen, setViewReceiptsOpen] = useState(false);
  const limit = 10;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["/api/expense-form-submissions/mine", statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const res = await fetch(
        buildApiUrl(`/api/expense-form-submissions/mine?${params}`),
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch submissions");
      return json;
    },
  });

  const submissions: Submission[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  function statusBadge(status: string) {
    if (status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Pending</Badge>;
    if (status === "approved") return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Approved</Badge>;
    return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Declined</Badge>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#EAEB80]" />
          My Expense Submissions
        </h3>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#EAEB80]" />
        </div>
      ) : isError ? (
        <p className="text-red-400 text-sm py-6 text-center">
          {error instanceof Error ? error.message : "Failed to load submissions."}
        </p>
      ) : submissions.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">No submissions yet.</p>
      ) : (
        <div className="rounded-lg border border-[#2a2a2a] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Car</TableHead>
                <TableHead className="text-gray-400">Category / Type</TableHead>
                <TableHead className="text-gray-400">Amount</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Remarks</TableHead>
                <TableHead className="text-gray-400">Decline Reason</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id} className="border-[#2a2a2a]">
                  <TableCell className="text-gray-300 text-sm">
                    {s.submissionDate} ({MONTHS[s.month - 1]} {s.year})
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">{s.carDisplayName || "—"}</TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {CATEGORY_LABELS[s.category] || s.category} / {formatFieldLabel(s.field)}
                  </TableCell>
                  <TableCell className="text-[#EAEB80] font-medium">
                    ${Number(s.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-gray-400 text-sm max-w-[120px] truncate" title={s.remarks || undefined}>
                    {s.remarks || "—"}
                  </TableCell>
                  <TableCell className="text-red-400/80 text-sm max-w-[150px] truncate" title={s.declineReason || undefined}>
                    {s.status === "declined" && s.declineReason ? s.declineReason : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.receiptUrls && s.receiptUrls.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-[#EAEB80]"
                        onClick={() => {
                          setSelectedSubmission(s);
                          setViewReceiptsOpen(true);
                        }}
                        title="View receipts"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded border border-[#2a2a2a] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded border border-[#2a2a2a] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
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
              {selectedSubmission?.remarks && ` • ${selectedSubmission.remarks}`}
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
}
