import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, ChevronRight } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeletons";

interface PayrunRow {
  payrun_aid: number;
  payrun_status: number;
  payrun_number: string;
  payrun_date_from: string;
  payrun_date_to: string;
  payrun_pay_date: string;
  payrun_total_amount: string;
  payrun_total_employee: string;
  payrun_remarks: string | null;
}

const PAYRUN_STATUS_MAP: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  0: { label: "Draft", variant: "secondary" },
  1: { label: "Paid", variant: "default" },
  2: { label: "On Hold", variant: "outline" },
  3: { label: "In Review", variant: "outline" },
};

function formatDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

function formatCurrency(s: string) {
  const n = parseFloat(s);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayrollPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ dateFrom: "", dateTo: "", payDate: "", remarks: "" });

  const { data, isLoading } = useQuery<{
    success: boolean;
    list: PayrunRow[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["/api/payroll/payruns", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(buildApiUrl(`/api/payroll/payruns?${params}`), { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load payruns");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { dateFrom: string; dateTo: string; payDate: string; remarks?: string | null }) => {
      const res = await fetch(buildApiUrl("/api/payroll/payruns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payrun");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/payruns"] });
      toast({ title: "Pay run created", description: `Pay run ${result?.data?.payrun_number ?? ""} created.` });
      setIsCreateOpen(false);
      setCreateForm({ dateFrom: "", dateTo: "", payDate: "", remarks: "" });
      if (result?.data?.payrun_aid) {
        setLocation(`/admin/payroll/${result.data.payrun_aid}`);
      }
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Error", description: e.message });
    },
  });

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.limit ? Math.ceil(total / data.limit) : 1;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Pay runs</h1>
            <p className="text-muted-foreground text-sm">Create and manage pay runs. Open a run to view payroll and payslips.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create pay run
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by number or remarks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(PAYRUN_STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay run #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Pay date</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Total amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><TableRowSkeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No pay runs found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row) => (
                      <TableRow key={row.payrun_aid}>
                        <TableCell className="font-medium">{row.payrun_number}</TableCell>
                        <TableCell>{formatDate(row.payrun_date_from)} – {formatDate(row.payrun_date_to)}</TableCell>
                        <TableCell>{formatDate(row.payrun_pay_date)}</TableCell>
                        <TableCell className="text-right">{row.payrun_total_employee}</TableCell>
                        <TableCell className="text-right">${formatCurrency(row.payrun_total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={PAYRUN_STATUS_MAP[row.payrun_status]?.variant ?? "outline"}>
                            {PAYRUN_STATUS_MAP[row.payrun_status]?.label ?? `Status ${row.payrun_status}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/admin/payroll/${row.payrun_aid}`)}
                          >
                            Open <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data?.page ?? 1} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create pay run</DialogTitle>
            <DialogDescription>
              Set the period and pay date. Eligible employees and their unpaid earnings/deductions in this period will be included.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date from</label>
                <Input
                  type="date"
                  value={createForm.dateFrom}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date to</label>
                <Input
                  type="date"
                  value={createForm.dateTo}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pay date</label>
              <Input
                type="date"
                value={createForm.payDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, payDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks (optional)</label>
              <Input
                placeholder="Remarks"
                value={createForm.remarks}
                onChange={(e) => setCreateForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!createForm.dateFrom || !createForm.dateTo || !createForm.payDate || createMutation.isPending}
              onClick={() => createMutation.mutate({
                dateFrom: createForm.dateFrom,
                dateTo: createForm.dateTo,
                payDate: createForm.payDate,
                remarks: createForm.remarks || null,
              })}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
