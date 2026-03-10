import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildApiUrl } from "@/lib/queryClient";
import { ArrowLeft, Search, FileText } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeletons";

interface PayrunRow {
  payrun_aid: number;
  payrun_number: string;
  payrun_date_from: string;
  payrun_date_to: string;
  payrun_pay_date: string;
  payrun_status: number;
}

interface PayrollListItem {
  payrun_list_aid: number;
  payrun_list_id: number;
  payrun_list_emp_id: number;
  payrun_list_status?: number;
  payrun_list_gross: string;
  payrun_list_deduction: string;
  payrun_list_net: string;
  employee_name?: string;
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

export default function PayrollByRunPage() {
  const [, params] = useRoute<{ payrunId: string }>("/admin/payroll/:payrunId");
  const [, setLocation] = useLocation();
  const payrunId = params?.payrunId ? parseInt(params.payrunId, 10) : null;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: payrunData } = useQuery<{ success: boolean; data: PayrunRow }>({
    queryKey: ["/api/payroll/payruns", payrunId],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(`/api/payroll/payruns/${payrunId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Payrun not found");
      return res.json();
    },
    enabled: payrunId != null,
  });

  const { data: payrollData, isLoading } = useQuery<{
    success: boolean;
    list: PayrollListItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["/api/payroll/payruns", payrunId, "payroll", page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(buildApiUrl(`/api/payroll/payruns/${payrunId}/payroll?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load payroll");
      return res.json();
    },
    enabled: payrunId != null,
  });

  const payrun = payrunData?.data;
  const list = payrollData?.list ?? [];
  const total = payrollData?.total ?? 0;
  const totalPages = payrollData?.limit ? Math.ceil(total / payrollData.limit) : 1;

  if (payrunId == null || Number.isNaN(payrunId)) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Invalid pay run.</p>
          <Button variant="link" className="p-0 mt-2" onClick={() => setLocation("/admin/payroll")}>Back to Pay runs</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/payroll")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Payroll: {payrun?.payrun_number ?? `#${payrunId}`}</h1>
            <p className="text-muted-foreground text-sm">
              {payrun ? `${formatDate(payrun.payrun_date_from)} – ${formatDate(payrun.payrun_date_to)} · Pay date: ${formatDate(payrun.payrun_pay_date)}` : "Loading…"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><TableRowSkeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No employees in this pay run.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row, idx) => (
                      <TableRow key={row.payrun_list_aid}>
                        <TableCell className="text-muted-foreground">{(page - 1) * 50 + idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.employee_name ?? `Employee #${row.payrun_list_emp_id}`}</TableCell>
                        <TableCell className="text-right">${formatCurrency(row.payrun_list_gross)}</TableCell>
                        <TableCell className="text-right">${formatCurrency(row.payrun_list_deduction)}</TableCell>
                        <TableCell className="text-right font-medium">${formatCurrency(row.payrun_list_net)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/admin/payroll/${payrunId}/payslip/${row.payrun_list_emp_id}`)}
                          >
                            <FileText className="mr-1 h-4 w-4" /> Payslip
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
                  Page {payrollData?.page ?? 1} of {totalPages} ({total} employees)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
