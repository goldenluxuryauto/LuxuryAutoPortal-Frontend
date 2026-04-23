import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2 } from "lucide-react";
import { useState } from "react";

function formatDate(d: string | null | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(String(d).replace(" ", "T"));
    return isNaN(x.getTime()) ? fallback : x.toLocaleDateString();
  } catch {
    return fallback;
  }
}

function formatTime(d: string | null | undefined, fallback = "--") {
  if (!d) return fallback;
  try {
    const x = new Date(String(d).replace(" ", "T"));
    return isNaN(x.getTime())
      ? fallback
      : x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return fallback;
  }
}

function decimalToHrsMin(decimal: number | string | undefined | null): string {
  if (decimal === undefined || decimal === null || decimal === "") return "--";
  const n = Number(decimal);
  if (isNaN(n) || n <= 0) return "0h";
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type NextAction =
  | "time_in"
  | "lunch_out"
  | "lunch_in"
  | "time_out"
  | "already_out"
  | "no_schedule";

interface LastRecord {
  time_aid?: number;
  time_date?: string;
  time_working_hours?: string;
  time_in?: string | null;
  time_in_status?: number | null;
  time_hours_per_day?: string | null;
  time_in_hours?: string | null;
  time_lunch_out?: string | null;
  time_lunch_in?: string | null;
  time_lunch_hours?: string | null;
  time_out?: string | null;
  time_out_hours?: string | null;
  time_total_hours?: string | null;
  time_amount?: string | null;
  time_form_details?: string | null;
}

export default function StaffTime() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [timeOutModalOpen, setTimeOutModalOpen] = useState(false);
  const [timeOutNotes, setTimeOutNotes] = useState("");

  const { data: lastData, isLoading, error } = useQuery<{
    success: boolean;
    data: { lastRecord: LastRecord | null; nextAction: NextAction };
  }>({
    queryKey: ["/api/me/time-sheet/last"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/time-sheet/last"), {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load time sheet");
      }
      return res.json();
    },
    retry: false,
  });

  const last = lastData?.data?.lastRecord ?? null;
  const nextAction = lastData?.data?.nextAction ?? "time_in";

  const getButtonLabel = () => {
    switch (nextAction) {
      case "time_in":
        return "Time in";
      case "lunch_out":
        return "Lunch out";
      case "lunch_in":
        return "Lunch in";
      case "time_out":
        return "Time out";
      case "already_out":
        return "Already clocked out";
      case "no_schedule":
        return "No schedule for today";
      default:
        return "Time in";
    }
  };

  const runAction = async (body: { time_form_details?: string }) => {
    setActionLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/me/time-sheet/action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Error",
          description: json.error || "Action failed",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Success",
        description: json.message || "Updated.",
      });
      setTimeOutModalOpen(false);
      setTimeOutNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/me/time-sheet/last"] });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionClick = () => {
    if (nextAction === "already_out" || nextAction === "no_schedule") return;
    if (nextAction === "time_out") {
      setTimeOutModalOpen(true);
      return;
    }
    runAction({});
  };

  const handleTimeOutSubmit = () => {
    const notes = timeOutNotes.trim();
    const details = notes
      ? JSON.stringify([{ name: "Notes", description: notes }])
      : "[]";
    runAction({ time_form_details: details });
  };

  const canPunch =
    nextAction !== "already_out" && nextAction !== "no_schedule" && !actionLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Time Sheet</h1>
            <p className="text-muted-foreground">Clock in, lunch, and clock out.</p>
          </div>
          <Button onClick={handleActionClick} disabled={!canPunch} className="gap-2">
            {actionLoading || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {getButtonLabel()}
          </Button>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-3 text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load time sheet"}
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Current status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !last ? (
              <p className="text-muted-foreground">
                {nextAction === "no_schedule"
                  ? "You don't have a work schedule for today. Contact HR to add a schedule."
                  : "No active time record. Use the button above to clock in."}
              </p>
            ) : (
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Schedule: </span>
                  {last.time_working_hours ?? "--"}
                </p>
                <p>
                  <span className="text-muted-foreground">Time in: </span>
                  {formatDate(last.time_date)} {formatTime(last.time_in)}
                  {last.time_in_status === 1 && (
                    <span className="text-amber-600 ml-1">
                      (Late: {decimalToHrsMin(last.time_in_hours)})
                    </span>
                  )}
                </p>
                {last.time_lunch_out && (
                  <p>
                    <span className="text-muted-foreground">Lunch out: </span>
                    {formatTime(last.time_lunch_out)}
                  </p>
                )}
                {last.time_lunch_in && (
                  <p>
                    <span className="text-muted-foreground">Lunch in: </span>
                    {formatTime(last.time_lunch_in)}
                    {last.time_lunch_hours != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({decimalToHrsMin(Number(last.time_lunch_hours))} break)
                      </span>
                    )}
                  </p>
                )}
                {last.time_out && (
                  <p>
                    <span className="text-muted-foreground">Time out: </span>
                    {formatDate(last.time_date)} {formatTime(last.time_out)}
                    {last.time_total_hours != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        — Total: {decimalToHrsMin(Number(last.time_total_hours))}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={timeOutModalOpen} onOpenChange={setTimeOutModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Time out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add any notes about today's work before clocking out (optional).
          </p>
          <div className="space-y-1">
            <Label htmlFor="timeout-notes">Notes</Label>
            <textarea
              id="timeout-notes"
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={timeOutNotes}
              onChange={(e) => setTimeOutNotes(e.target.value)}
              placeholder="e.g. Completed vehicle inspections, assisted 3 clients…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTimeOutModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleTimeOutSubmit} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit time out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
