import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { buildApiUrl } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Info, Loader2 } from "lucide-react";
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

function formatTime(d: string | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(d);
    return isNaN(x.getTime()) ? fallback : x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return fallback;
  }
}

function decimalToHrsMin(decimal: number | string | undefined): string {
  if (decimal === undefined || decimal === null || decimal === "") return "--";
  const n = Number(decimal);
  if (isNaN(n)) return "--";
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface TimeRow {
  time_date?: string;
  work_sched_date?: string;
  work_sched_time?: string;
  time_hours_per_day?: number;
  time_in?: string;
  time_in_hours?: number;
  time_in_status?: number;
  time_lunch_out?: string;
  time_lunch_in?: string;
  time_lunch_hours?: number;
  time_out?: string;
  time_out_hours?: number;
  time_out_status?: number;
  time_total_hours?: number;
  time_amount?: number;
  time_remarks?: string;
  time_form_details?: string;
}

export default function StaffTime() {
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewMoreItem, setViewMoreItem] = useState<TimeRow | null>(null);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const listUrl = `/api/staff/time?${params.toString()}`;

  const { data: listData, isLoading } = useQuery<{ success?: boolean; data?: TimeRow[] }>({
    queryKey: ["staff-time", listUrl],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(listUrl), { credentials: "include" });
      if (res.status === 404 || res.status === 501) return { success: true, data: [] };
      if (!res.ok) throw new Error("Failed to load time entries");
      return res.json();
    },
    retry: false,
  });

  const { data: lastInOut } = useQuery<{ success?: boolean; data?: TimeRow[] }>({
    queryKey: ["staff-time-last"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/staff/time/last-in-out"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.status === 404 || res.status === 501) return { success: true, data: [] };
      if (!res.ok) throw new Error("Failed to load last time");
      return res.json();
    },
    retry: false,
  });

  const rows: TimeRow[] = listData?.data ?? [];
  const last = lastInOut?.data?.[0];
  const canTimeInOut = !last?.time_out;
  const isOnBreak = !!(last?.time_lunch_in === "" && last?.time_lunch_out !== "");

  const handleTimeInOut = async () => {
    if (isOnBreak) {
      setViewMoreItem(last ?? null);
      return;
    }
    try {
      const res = await fetch(buildApiUrl("/api/staff/time/action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["staff-time"] });
        queryClient.invalidateQueries({ queryKey: ["staff-time-last"] });
      }
    } catch {
      // API may not exist yet
      queryClient.invalidateQueries({ queryKey: ["staff-time"] });
      queryClient.invalidateQueries({ queryKey: ["staff-time-last"] });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Time</h1>
            <p className="text-muted-foreground">Time entries and timesheets.</p>
          </div>
          <Button onClick={handleTimeInOut} disabled={isOnBreak} className="gap-2">
            <Clock className="w-4 h-4" />
            Time in / out
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Time entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="undertime">Undertime</SelectItem>
                  <SelectItem value="overbreak">Overbreak</SelectItem>
                  <SelectItem value="early">Early</SelectItem>
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
                <div className="py-12 text-center text-muted-foreground">No time entries found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Work schedule</TableHead>
                      <TableHead className="text-center">Hrs/day</TableHead>
                      <TableHead>Time in</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead>Break out</TableHead>
                      <TableHead>Break in</TableHead>
                      <TableHead className="text-center">Break</TableHead>
                      <TableHead>Time out</TableHead>
                      <TableHead className="text-center">Undertime</TableHead>
                      <TableHead className="text-right">Time spent</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}.</TableCell>
                        <TableCell>
                          {formatDate(item.work_sched_date)} {item.work_sched_time ?? ""}
                        </TableCell>
                        <TableCell className="text-center">{decimalToHrsMin(item.time_hours_per_day)}</TableCell>
                        <TableCell>
                          {formatDate(item.time_date)} {formatTime(item.time_in)}
                        </TableCell>
                        <TableCell className="text-center">{decimalToHrsMin(item.time_in_hours)}</TableCell>
                        <TableCell>{formatDate(item.time_lunch_out)} {formatTime(item.time_lunch_out)}</TableCell>
                        <TableCell>{formatDate(item.time_lunch_in)} {formatTime(item.time_lunch_in)}</TableCell>
                        <TableCell className="text-center">{decimalToHrsMin(item.time_lunch_hours)}</TableCell>
                        <TableCell>{formatDate(item.time_out)} {formatTime(item.time_out)}</TableCell>
                        <TableCell className="text-center">{decimalToHrsMin(item.time_out_hours)}</TableCell>
                        <TableCell className="text-right">{decimalToHrsMin(item.time_total_hours)}</TableCell>
                        <TableCell className="text-right">
                          {item.time_amount != null ? `$${Number(item.time_amount).toFixed(2)}` : "--"}
                        </TableCell>
                        <TableCell>
                          {item.time_form_details ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMoreItem(item)}>
                              <Info className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewMoreItem} onOpenChange={(open) => !open && setViewMoreItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View details</DialogTitle>
          </DialogHeader>
          {viewMoreItem?.time_form_details && (
            <div className="text-sm text-muted-foreground">
              {(() => {
                try {
                  const arr = JSON.parse(viewMoreItem.time_form_details as string);
                  return Array.isArray(arr) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {arr.map((x: { name?: string; description?: string }, i: number) => (
                        <li key={i}>{x.name ?? ""}: {x.description ?? ""}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{String(viewMoreItem.time_form_details)}</p>
                  );
                } catch {
                  return <p>{String(viewMoreItem.time_form_details)}</p>;
                }
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
