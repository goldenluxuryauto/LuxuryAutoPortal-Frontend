import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";

interface PayrunRow {
  payrun_aid: number;
  payrun_number: string;
  payrun_date_from: string;
  payrun_date_to: string;
  payrun_pay_date: string;
  payrun_status: number;
}

interface PayrunListRow {
  payrun_list_gross: string;
  payrun_list_deduction: string;
  payrun_list_net: string;
}

interface PaysummaryRow {
  paysummary_name: string;
  paysummary_is_deduction: number;
  paysummary_is_earnings: number;
  paysummary_amount: string;
  paysummary_rate: string;
  paysummary_hrs: string;
}

interface PayslipData {
  payrun: PayrunRow;
  payrunList: PayrunListRow;
  paysummary: PaysummaryRow[];
}

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

export default function PayslipPage() {
  const [, params] = useRoute<{ payrunId: string; employeeId: string }>("/admin/payroll/:payrunId/payslip/:employeeId");
  const [, setLocation] = useLocation();
  const payrunId = params?.payrunId ? parseInt(params.payrunId, 10) : null;
  const employeeId = params?.employeeId ? parseInt(params.employeeId, 10) : null;

  const { data: res, isLoading, error } = useQuery<{ success: boolean; data: PayslipData }>({
    queryKey: ["/api/payroll/payruns", payrunId, "payslip", employeeId],
    queryFn: async () => {
      const r = await fetch(buildApiUrl(`/api/payroll/payruns/${payrunId}/payslip/${employeeId}`), { credentials: "include" });
      if (!r.ok) throw new Error("Payslip not found");
      return r.json();
    },
    enabled: payrunId != null && employeeId != null,
  });

  const data = res?.data;
  const earnings = data?.paysummary?.filter((l) => l.paysummary_is_earnings === 1) ?? [];
  const deductions = data?.paysummary?.filter((l) => l.paysummary_is_deduction === 1) ?? [];

  if (payrunId == null || employeeId == null || Number.isNaN(payrunId) || Number.isNaN(employeeId)) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Invalid payslip.</p>
          <Button variant="link" className="p-0 mt-2" onClick={() => setLocation("/admin/payroll")}>Back to Pay runs</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/payroll/${payrunId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Payslip</h1>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load payslip.</p>}
        {data && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Pay run {data.payrun.payrun_number}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Period: {formatDate(data.payrun.payrun_date_from)} – {formatDate(data.payrun.payrun_date_to)} · Pay date: {formatDate(data.payrun.payrun_pay_date)}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              {earnings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Earnings</h3>
                  <ul className="space-y-1">
                    {earnings.map((line, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{line.paysummary_name || "Earning"}</span>
                        <span>${formatCurrency(line.paysummary_amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {deductions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Deductions</h3>
                  <ul className="space-y-1">
                    {deductions.map((line, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{line.paysummary_name || "Deduction"}</span>
                        <span>-${formatCurrency(line.paysummary_amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between font-semibold text-base">
                <span>Gross</span>
                <span>${formatCurrency(data.payrunList.payrun_list_gross)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total deductions</span>
                <span>-${formatCurrency(data.payrunList.payrun_list_deduction)}</span>
              </div>
              <div className="border-t mt-2 pt-4 flex justify-between font-semibold text-lg">
                <span>Net pay</span>
                <span>${formatCurrency(data.payrunList.payrun_list_net)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}