import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/queryClient";
import { ChevronRight, Loader2, User } from "lucide-react";

/** V1-style section list: Personal Information, Job and Pay, Earnings, Deduction, Payslip */
const MY_INFO_SECTIONS = [
  { id: "personal-information", label: "Personal Information" },
  { id: "job-and-pay", label: "Job and Pay" },
  { id: "earnings", label: "Earnings" },
  { id: "deduction", label: "Deduction" },
  { id: "payslip", label: "Payslip" },
] as const;

export default function StaffMyInfo() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: { employee_first_name?: string; employee_last_name?: string } }>({
    queryKey: ["/api/me/employee"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/me/employee"), { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load your employee record");
      }
      return res.json();
    },
    retry: false,
  });

  const employee = data?.data;
  const hasEmployee = !!employee;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Info</h1>
          <p className="text-muted-foreground">Your profile and employment information.</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && error && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                We couldn&apos;t load your employee record. You may not have an HR profile linked to this account. Please contact HR if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && hasEmployee && (
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {MY_INFO_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`/staff/my-info/${section.id}`}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground">{section.label}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
