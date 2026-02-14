import { AdminLayout } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { buildApiUrl } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TreePalm, Plus, Loader2 } from "lucide-react";
import { useState } from "react";

function formatDate(d: string | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(d);
    return isNaN(x.getTime()) ? fallback : x.toLocaleDateString();
  } catch {
    return fallback;
  }
}

function LeaveStatusBadge({ status }: { status?: number }) {
  const s = Number(status);
  if (s === 1) return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
  if (s === 3) return <Badge variant="destructive">Declined</Badge>;
  if (s === 2) return <Badge variant="secondary">Cancel</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

interface LeaveItem {
  leave_aid?: string;
  leave_is_status?: number;
  leave_date?: string;
  leave_type?: string;
  leave_hour?: number;
  leave_minute?: number;
  leave_amount?: number;
  leave_remarks?: string;
}

export default function StaffTimeOff() {
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formType, setFormType] = useState("paid time off");
  const [formHours, setFormHours] = useState("");
  const [formMinutes, setFormMinutes] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const listUrl = `/api/staff/leave?${params.toString()}`;

  const { data, isLoading } = useQuery<{ success?: boolean; data?: LeaveItem[] }>({
    queryKey: ["staff-leave", listUrl],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(listUrl), { credentials: "include" });
      if (res.status === 404 || res.status === 501) return { success: true, data: [] };
      if (!res.ok) throw new Error("Failed to load leave");
      return res.json();
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      leave_date: string;
      leave_type: string;
      leave_hour: string;
      leave_minute: string;
      leave_remarks: string;
    }) => {
      const res = await fetch(buildApiUrl("/api/staff/leave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-leave"] });
      setApplyOpen(false);
      setFormRemarks("");
    },
  });

  const rows: LeaveItem[] = data?.data ?? [];

  const handleApply = () => {
    createMutation.mutate({
      leave_date: formDate,
      leave_type: formType,
      leave_hour: formHours,
      leave_minute: formMinutes,
      leave_remarks: formRemarks,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Time off</h1>
            <p className="text-muted-foreground">Request and view time off.</p>
          </div>
          <Button onClick={() => setApplyOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Apply
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <TreePalm className="w-5 h-5" />
              Leave requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="0">Pending</SelectItem>
                  <SelectItem value="1">Approved</SelectItem>
                  <SelectItem value="3">Declined</SelectItem>
                  <SelectItem value="2">Cancel</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[140px]" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[140px]" />
            </div>

            <div className="rounded-md border border-border overflow-auto max-h-[55vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No leave requests found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Leave type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item, idx) => (
                      <TableRow key={item.leave_aid ?? idx}>
                        <TableCell>{idx + 1}.</TableCell>
                        <TableCell><LeaveStatusBadge status={item.leave_is_status} /></TableCell>
                        <TableCell>{formatDate(item.leave_date)}</TableCell>
                        <TableCell className="uppercase">{item.leave_type ?? "--"}</TableCell>
                        <TableCell>
                          {item.leave_hour != null && item.leave_minute != null
                            ? `${item.leave_hour}h ${item.leave_minute}m`
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.leave_amount != null ? `$${Number(item.leave_amount).toFixed(2)}` : "--"}
                        </TableCell>
                        <TableCell>{item.leave_remarks ?? "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply time off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Leave type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid time off">Paid Time Off</SelectItem>
                  <SelectItem value="sick time off">Sick Time Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                className="mt-1 min-h-[80px]"
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button
                onClick={handleApply}
                disabled={createMutation.isPending || !formHours || !formMinutes}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
