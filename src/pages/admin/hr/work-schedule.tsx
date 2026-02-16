/**
 * Work Schedule page – v1 parity.
 * Month filter, calendar grid (Sun–Sat), add/edit/view/delete modals.
 */

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
import { Label } from "@/components/ui/label";
import {
  getArrayTotalDaysInMonthAndYear,
  getMonthYearNow,
  getWeeksCount,
  getWeekRow,
  WEEK_DAYS,
  type DayCell,
} from "@/lib/work-schedule-calendar";
import { buildApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT_CELL = 3;

interface WorkSchedEntry {
  work_sched_aid: number;
  work_sched_date: string;
  work_sched_code: string;
  work_sched_emp_id: number;
  work_sched_time: string;
  work_sched_start_time: string;
  work_sched_end_time: string;
  fullname: string;
  employee_aid: number;
}

function useWorkSchedByCode(code: string, limit: number) {
  return useQuery({
    queryKey: ["work-sched", "read-by-code", code, limit],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/admin/work-sched/read-by-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ work_sched_code: code, limit }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return (json.data ?? []) as WorkSchedEntry[];
    },
    enabled: !!code && code.length >= 8,
  });
}

function DayCellContent({
  cell,
  month,
  onAdd,
  onViewMore,
  onEdit,
  onDelete,
}: {
  cell: DayCell;
  month: string;
  onAdd: (cell: DayCell) => void;
  onViewMore: (cell: DayCell) => void;
  onEdit: (cell: DayCell, entry: WorkSchedEntry) => void;
  onDelete: (entry: WorkSchedEntry) => void;
}) {
  const code = cell.originalDateCode;
  const { data: list = [], isLoading, refetch } = useWorkSchedByCode(code, LIMIT_CELL);
  const isToday = code && new Date().toISOString().slice(0, 10).replace(/-/g, "") === code;

  if (cell.day === 0) {
    return (
      <td className="min-w-[10rem] border-b border-border p-2 align-top">
        <div className="h-[10rem]" />
      </td>
    );
  }

  return (
    <td className="min-w-[10rem] border-b border-border p-2 align-top">
      <div className="min-h-[10rem]">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`inline-flex h-[21px] w-[21px] items-center justify-center rounded-full border text-center text-sm font-semibold ${
              isToday ? "border-primary bg-primary text-primary-foreground" : "border-accent text-accent"
            }`}
          >
            {cell.day}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={() => onAdd(cell)}
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((entry) => (
              <div
                key={entry.work_sched_aid}
                className="flex items-center justify-between rounded bg-primary/10 px-2 py-1 text-sm group"
              >
                <span className="truncate" title={entry.work_sched_time}>
                  {entry.fullname}
                </span>
                <span className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 opacity-70 hover:bg-black/10 hover:opacity-100"
                    title="Edit"
                    onClick={() => onEdit(cell, entry)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 opacity-70 hover:bg-destructive/20 hover:opacity-100"
                    title="Delete"
                    onClick={() => onDelete(entry)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ))}
            {list.length >= LIMIT_CELL && (
              <button
                type="button"
                className="w-full text-center text-sm text-primary hover:underline"
                onClick={() => onViewMore(cell)}
              >
                View More
              </button>
            )}
          </div>
        )}
      </div>
    </td>
  );
}

function AddEditModal({
  open,
  onClose,
  cell,
  editEntry,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  cell: DayCell | null;
  editEntry: WorkSchedEntry | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [employeeSearch, setEmployeeSearch] = useState("");
  type EmployeeOption = {
    employee_aid: number;
    fullname: string;
    employee_job_pay_salary_rate?: string | null;
    employee_job_pay_department_name?: string | null;
    employee_job_pay_job_title_name?: string | null;
    employee_job_pay_work_email?: string | null;
  };
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(
    editEntry ? { employee_aid: editEntry.employee_aid, fullname: editEntry.fullname } : null
  );
  const [startTime, setStartTime] = useState(editEntry?.work_sched_start_time?.slice(0, 5) ?? "09:00");
  const [endTime, setEndTime] = useState(editEntry?.work_sched_end_time?.slice(0, 5) ?? "17:00");
  const [focusSearch, setFocusSearch] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isEdit = !!editEntry;

  const { data: searchResults = [] } = useQuery({
    queryKey: ["work-sched", "search-employee", employeeSearch],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/admin/work-sched/search-employee"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ searchValue: employeeSearch }),
      });
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      return (json.data ?? []) as EmployeeOption[];
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(buildApiUrl("/api/admin/work-sched"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-sched"] });
      onSuccess();
      onClose();
      toast({ title: "Success", description: "Schedule added." });
    },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(buildApiUrl(`/api/admin/work-sched/${editEntry!.work_sched_aid}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-sched"] });
      onSuccess();
      onClose();
      toast({ title: "Success", description: "Schedule updated." });
    },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" }),
  });

  useEffect(() => {
    if (!open) return;
    setSelectedEmployee(editEntry ? { employee_aid: editEntry.employee_aid, fullname: editEntry.fullname } : null);
    setStartTime(editEntry?.work_sched_start_time?.slice(0, 5) ?? "09:00");
    setEndTime(editEntry?.work_sched_end_time?.slice(0, 5) ?? "17:00");
    setEmployeeSearch(editEntry?.fullname ?? "");
  }, [open, editEntry]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocusSearch(false);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cell || !selectedEmployee) {
      toast({ title: "Validation", description: "Please select an employee.", variant: "destructive" });
      return;
    }
    if (isEdit) {
      updateMutation.mutate({
        work_sched_emp_id: selectedEmployee.employee_aid,
        work_sched_start_time: startTime,
        work_sched_end_time: endTime,
      });
    } else {
      createMutation.mutate({
        work_sched_date: cell.originalDate,
        work_sched_code: cell.originalDateCode,
        work_sched_emp_id: selectedEmployee.employee_aid,
        work_sched_start_time: startTime,
        work_sched_end_time: endTime,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const dateLabel = cell ? new Date(cell.originalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} Work Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="font-medium">
            Date: <span className="text-muted-foreground">{dateLabel}</span>
          </p>
          <div ref={ref} className="relative">
            <Label>Employee</Label>
            <Input
              type="search"
              value={selectedEmployee ? selectedEmployee.fullname : employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                if (!e.target.value) setSelectedEmployee(null);
              }}
              onFocus={() => setFocusSearch(true)}
              placeholder="Search employee..."
              className="mt-1"
            />
            {focusSearch && !selectedEmployee && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
                {searchResults.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
                ) : (
                  searchResults.map((emp) => {
                    const dept = emp.employee_job_pay_department_name?.trim() ?? "";
                    const title = emp.employee_job_pay_job_title_name?.trim() ?? "";
                    const email = emp.employee_job_pay_work_email?.trim() ?? "";
                    const subtitle = [dept, title].filter(Boolean).join(" · ") || email || null;
                    return (
                      <li key={emp.employee_aid}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch(emp.fullname);
                            setFocusSearch(false);
                          }}
                        >
                          <div className="font-medium text-sm">{emp.fullname}</div>
                          {subtitle && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {subtitle}
                            </div>
                          )}
                          {!emp.employee_job_pay_salary_rate && (
                            <div className="text-xs text-destructive mt-0.5">NO SALARY RATE</div>
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
            {selectedEmployee && (selectedEmployee.employee_job_pay_department_name || selectedEmployee.employee_job_pay_job_title_name || selectedEmployee.employee_job_pay_work_email) && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                {[selectedEmployee.employee_job_pay_department_name, selectedEmployee.employee_job_pay_job_title_name]
                  .filter(Boolean)
                  .join(" · ") || selectedEmployee.employee_job_pay_work_email}
              </div>
            )}
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
            <div>
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" required />
            </div>
            <span className="pb-2">to</span>
            <div>
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewMoreModal({
  open,
  onClose,
  cell,
  onAdd,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  cell: DayCell | null;
  onAdd: (cell: DayCell) => void;
  onEdit: (cell: DayCell, entry: WorkSchedEntry) => void;
  onDelete: (entry: WorkSchedEntry) => void;
}) {
  const code = cell?.originalDateCode ?? "";
  const { data: list = [], isLoading } = useWorkSchedByCode(code, 0);
  const dateLabel = cell ? new Date(cell.originalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>View Work Schedule</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <p className="font-medium">Date: {dateLabel}</p>
          {cell && (
            <Button size="sm" variant="outline" onClick={() => { onAdd(cell); onClose(); }}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-auto rounded border">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 p-2 text-left">#</th>
                  <th className="p-2 text-left">Employee</th>
                  <th className="p-2 text-left">Work Schedule</th>
                  <th className="w-20 p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry, i) => (
                  <tr key={entry.work_sched_aid} className="border-b">
                    <td className="p-2">{i + 1}.</td>
                    <td className="p-2">{entry.fullname}</td>
                    <td className="p-2 uppercase">{entry.work_sched_time}</td>
                    <td className="p-2">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => cell && onEdit(cell, entry)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(entry)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  entry,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  entry: WorkSchedEntry | null;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!entry) return;
    setDeleting(true);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/work-sched/${entry.work_sched_aid}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      queryClient.invalidateQueries({ queryKey: ["work-sched"] });
      onConfirm();
      onClose();
      toast({ title: "Deleted", description: "Schedule deleted successfully." });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete schedule</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Are you sure you want to delete this record? {entry && <strong>{entry.fullname}</strong>}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkSchedulePage() {
  const [month, setMonth] = useState(getMonthYearNow());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<DayCell | null>(null);
  const [editEntry, setEditEntry] = useState<WorkSchedEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<WorkSchedEntry | null>(null);

  const dayCells = getArrayTotalDaysInMonthAndYear(month);
  const weeksCount = getWeeksCount(dayCells);
  const weeks = Array.from({ length: weeksCount }, (_, i) => i + 1);

  const handleAdd = useCallback((cell: DayCell) => {
    setEditEntry(null);
    setSelectedCell(cell);
    setAddModalOpen(true);
  }, []);

  const handleViewMore = useCallback((cell: DayCell) => {
    setSelectedCell(cell);
    setViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((cell: DayCell, entry: WorkSchedEntry) => {
    setSelectedCell(cell);
    setEditEntry(entry);
    setAddModalOpen(true);
    setViewModalOpen(false);
  }, []);

  const handleDelete = useCallback((entry: WorkSchedEntry) => {
    setDeleteEntry(entry);
    setDeleteModalOpen(true);
    setViewModalOpen(false);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Work Schedule</h1>
          <p className="text-muted-foreground">Manage employee work schedule by month and day.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-md border">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    {WEEK_DAYS.map((d) => (
                      <th key={d} className="border-b border-border p-2 text-center font-medium">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((weekNum) => {
                    const weekRow = getWeekRow(dayCells, weekNum);
                    return (
                      <tr key={weekNum}>
                        {weekRow.map((cell, idx) => (
                          <DayCellContent
                            key={cell.originalDateCode || `w${weekNum}-${idx}`}
                            cell={cell}
                            month={month}
                            onAdd={handleAdd}
                            onViewMore={handleViewMore}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddEditModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSelectedCell(null); setEditEntry(null); }}
        cell={selectedCell}
        editEntry={editEntry}
        onSuccess={() => {}}
      />
      <ViewMoreModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedCell(null); }}
        cell={selectedCell}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteEntry(null); }}
        entry={deleteEntry}
        onConfirm={() => {}}
      />
    </AdminLayout>
  );
}
